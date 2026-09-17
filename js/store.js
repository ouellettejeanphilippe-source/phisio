/**
 * Couche de données de FitTrack Pro.
 *
 * Tout ce qui touche à la persistance passe par ici : écriture robuste dans le
 * localStorage (avec gestion du quota), journal de performance par exercice,
 * sauvegarde / restauration complète, et mémorisation de la séance en cours.
 *
 * Les fonctions de calcul sont pures pour être testables (voir js/store.test.js).
 */

const STORE_KEYS = {
    data: 'fitness_data',
    sessions: 'fitness_sessions',
    history: 'fitness_history',
    logs: 'fitness_logs',
    syncUrl: 'sync_url',
    lastSync: 'last_sync',
    soundPref: 'fitness_sound_pref',
    prefillPref: 'fitness_prefill_pref',
    snapshot: 'fitness_snapshot',
    activeSession: 'fitness_active_session',
    catalogue: 'fitness_catalogue'
};

/** Nombre d'entrées de journal conservées par exercice (les plus anciennes sont élaguées). */
const LOG_LIMIT_PER_EX = 80;
/** Nombre de séances conservées dans l'historique. */
const SESSION_LIMIT = 800;
/** Au-delà de ce délai, une séance interrompue n'est plus proposée à la reprise. */
const ACTIVE_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
/** Identifiant du format de sauvegarde, pour valider les fichiers importés. */
const BACKUP_FORMAT = 'fittrack-backup';
const BACKUP_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Accès bas niveau au stockage                                        */
/* ------------------------------------------------------------------ */

function safeParse(raw, fallback) {
    if (raw === null || raw === undefined || raw === '') return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed === null ? fallback : parsed;
    } catch (e) {
        console.warn('Données locales illisibles, valeur par défaut utilisée.', e);
        return fallback;
    }
}

function readJSON(key, fallback) {
    try {
        return safeParse(localStorage.getItem(key), fallback);
    } catch (e) {
        console.warn(`Lecture impossible pour "${key}".`, e);
        return fallback;
    }
}

function isQuotaError(e) {
    return !!e && (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 ||
        e.code === 1014
    );
}

/**
 * Écrit une valeur JSON. En cas de quota dépassé, élague le journal le plus
 * ancien puis réessaie une fois : on préfère perdre de vieilles statistiques
 * plutôt que la donnée que l'utilisateur vient de produire.
 * @returns {{ok: boolean, error?: string}}
 */
function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return { ok: true };
    } catch (e) {
        if (!isQuotaError(e)) {
            console.error(`Écriture impossible pour "${key}".`, e);
            return { ok: false, error: 'write' };
        }
        try {
            pruneOldestLogs(0.5);
            localStorage.setItem(key, JSON.stringify(value));
            return { ok: true };
        } catch (e2) {
            console.error('Quota de stockage dépassé.', e2);
            return { ok: false, error: 'quota' };
        }
    }
}

/** Supprime une fraction des entrées de journal les plus anciennes. */
function pruneOldestLogs(ratio) {
    const logs = readLogs();
    Object.keys(logs).forEach(exId => {
        const entries = logs[exId];
        if (!Array.isArray(entries) || entries.length < 2) return;
        const keep = Math.max(1, Math.floor(entries.length * (1 - ratio)));
        logs[exId] = entries.slice(-keep);
    });
    localStorage.setItem(STORE_KEYS.logs, JSON.stringify(logs));
}

/* ------------------------------------------------------------------ */
/* Dates et formatage                                                  */
/* ------------------------------------------------------------------ */

/** Clé de jour locale (YYYY-MM-DD) utilisée pour les séries et la heatmap. */
function dayKey(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const j = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${j}`;
}

/** Écart en jours calendaires entre deux dates. */
function daysBetween(fromIso, nowIso) {
    const a = new Date(dayKey(fromIso) + 'T00:00:00');
    const b = new Date(dayKey(nowIso || new Date()) + 'T00:00:00');
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    return Math.round((b - a) / 86400000);
}

/** "aujourd'hui", "hier", "il y a 4 j"... */
function relativeDay(iso, now) {
    const diff = daysBetween(iso, now);
    if (diff === null) return '';
    if (diff <= 0) return "aujourd'hui";
    if (diff === 1) return 'hier';
    if (diff < 7) return `il y a ${diff} j`;
    if (diff < 30) return `il y a ${Math.floor(diff / 7)} sem.`;
    return `il y a ${Math.floor(diff / 30)} mois`;
}

function formatDuration(seconds) {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Journal de performance                                              */
/* ------------------------------------------------------------------ */

function toNumber(value, fallback) {
    const n = parseFloat(value);
    return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
}

/** Normalise les séries réalisées : {valeur, poids} numériques. */
function normalizeSets(sets) {
    if (!Array.isArray(sets)) return [];
    return sets.map(s => ({
        valeur: toNumber(s && s.valeur, 0),
        poids: toNumber(s && s.poids, 0)
    }));
}

/**
 * Volume d'une performance : tonnage pour les charges, total de reps,
 * de secondes ou de kilomètres sinon. Sert d'indicateur de progression.
 */
function computeVolume(type, sets) {
    const list = normalizeSets(sets);
    if (type === 'poids') {
        return list.reduce((acc, s) => acc + s.valeur * (s.poids || 0), 0);
    }
    return list.reduce((acc, s) => acc + s.valeur, 0);
}

function volumeUnit(type) {
    if (type === 'poids') return 'kg soulevés';
    if (type === 'secs') return 'secondes';
    if (type === 'kegel') return 'cycles';
    if (type === 'distance') return 'km';
    return 'reps';
}

/** "3 × 12 @ 10 kg" — résumé compact d'une performance journalisée. */
function formatPerf(entry) {
    if (!entry) return '';
    const sets = normalizeSets(entry.sets);
    if (sets.length === 0) return '';

    const unite = entry.type === 'secs' ? 's'
        : entry.type === 'kegel' ? ' cycles'
        : entry.type === 'distance' ? ' km'
        : ' reps';

    const valeurs = sets.map(s => s.valeur);
    const toutesEgales = valeurs.every(v => v === valeurs[0]);
    const base = toutesEgales
        ? `${sets.length} × ${valeurs[0]}${unite}`
        : valeurs.join(' / ') + unite;

    const poidsMax = Math.max(...sets.map(s => s.poids || 0));
    return poidsMax > 0 ? `${base} @ ${poidsMax} kg` : base;
}

/**
 * Cible suggérée pour la prochaine séance : ce qui a réellement été réalisé
 * la dernière fois (meilleure série), ce qui fait survivre la surcharge
 * intelligente d'une séance à l'autre.
 */
function suggestTarget(entry) {
    if (!entry) return null;
    const sets = normalizeSets(entry.sets);
    if (sets.length === 0) return null;
    return {
        valeur: Math.max(...sets.map(s => s.valeur)),
        poids: Math.max(...sets.map(s => s.poids || 0))
    };
}

function readLogs() {
    const logs = readJSON(STORE_KEYS.logs, {});
    return (logs && typeof logs === 'object' && !Array.isArray(logs)) ? logs : {};
}

function writeLogs(logs) {
    return writeJSON(STORE_KEYS.logs, logs);
}

/** Ajoute une performance au journal d'un exercice. */
function appendLog(entry) {
    if (!entry || !entry.exId) return { ok: false, error: 'invalid' };
    const logs = readLogs();
    const key = String(entry.exId);
    const liste = Array.isArray(logs[key]) ? logs[key] : [];
    liste.push(entry);
    logs[key] = liste.slice(-LOG_LIMIT_PER_EX);
    return writeLogs(logs);
}

function getLogs(exId) {
    const liste = readLogs()[String(exId)];
    return Array.isArray(liste) ? liste : [];
}

/** Dernière performance enregistrée pour un exercice (ou null). */
function getLastPerf(exId) {
    const liste = getLogs(exId);
    return liste.length ? liste[liste.length - 1] : null;
}

/** Points de progression (volume par date) pour le graphique d'un exercice. */
function getProgression(exId, limit) {
    const liste = getLogs(exId).slice(-(limit || 12));
    return liste.map(e => ({
        date: e.date,
        volume: toNumber(e.volume, computeVolume(e.type, e.sets)),
        resume: formatPerf(e)
    }));
}

/* ------------------------------------------------------------------ */
/* Séances                                                             */
/* ------------------------------------------------------------------ */

function readSessions() {
    const s = readJSON(STORE_KEYS.sessions, []);
    return Array.isArray(s) ? s : [];
}

function appendSession(session) {
    const sessions = readSessions();
    sessions.push(session);
    return writeJSON(STORE_KEYS.sessions, sessions.slice(-SESSION_LIMIT));
}

function updateLastSession(patch) {
    const sessions = readSessions();
    if (sessions.length === 0) return { ok: false, error: 'empty' };
    sessions[sessions.length - 1] = Object.assign({}, sessions[sessions.length - 1], patch);
    return writeJSON(STORE_KEYS.sessions, sessions);
}

/**
 * Série de jours consécutifs avec au moins une séance.
 * La série reste vivante tant qu'on s'est entraîné aujourd'hui ou hier.
 */
function computeStreak(sessions, now) {
    if (!Array.isArray(sessions) || sessions.length === 0) return 0;
    const jours = new Set(sessions.map(s => dayKey(s && s.date)).filter(Boolean));
    if (jours.size === 0) return 0;

    const reference = now ? new Date(now) : new Date();
    let curseur = new Date(dayKey(reference) + 'T00:00:00');

    if (!jours.has(dayKey(curseur))) {
        curseur.setDate(curseur.getDate() - 1);
        if (!jours.has(dayKey(curseur))) return 0;
    }

    let streak = 0;
    while (jours.has(dayKey(curseur))) {
        streak++;
        curseur.setDate(curseur.getDate() - 1);
    }
    return streak;
}

/* ------------------------------------------------------------------ */
/* Séance en cours (reprise après interruption)                        */
/* ------------------------------------------------------------------ */

function saveActiveSession(state) {
    if (!state) return { ok: false, error: 'invalid' };
    return writeJSON(STORE_KEYS.activeSession, Object.assign({ savedAt: Date.now() }, state));
}

/** Renvoie la séance interrompue si elle est encore récente, sinon null. */
function readActiveSession(now) {
    const state = readJSON(STORE_KEYS.activeSession, null);
    if (!state || typeof state !== 'object') return null;
    const age = (now || Date.now()) - toNumber(state.savedAt, 0);
    if (age < 0 || age > ACTIVE_SESSION_MAX_AGE_MS) return null;
    if (!Array.isArray(state.exercices) || state.exercices.length === 0) return null;
    return state;
}

function clearActiveSession() {
    try {
        localStorage.removeItem(STORE_KEYS.activeSession);
    } catch (e) {
        console.warn('Impossible de purger la séance en cours.', e);
    }
}

/* ------------------------------------------------------------------ */
/* Sauvegarde / restauration                                           */
/* ------------------------------------------------------------------ */

/** Construit l'enveloppe de sauvegarde complète (données + historique + réglages). */
function buildBackup() {
    return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: readJSON(STORE_KEYS.data, { exercices: [], plans: [] }),
        sessions: readSessions(),
        history: readJSON(STORE_KEYS.history, {}),
        logs: readLogs(),
        settings: {
            syncUrl: (function () { try { return localStorage.getItem(STORE_KEYS.syncUrl) || ''; } catch (e) { return ''; } })(),
            soundPref: (function () { try { return localStorage.getItem(STORE_KEYS.soundPref); } catch (e) { return null; } })(),
            prefillPref: (function () { try { return localStorage.getItem(STORE_KEYS.prefillPref); } catch (e) { return null; } })()
        }
    };
}

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Lit un fichier de sauvegarde. Accepte l'enveloppe complète comme l'ancien
 * format d'export (`{exercices, plans}`), pour ne jamais rejeter une
 * sauvegarde que l'utilisateur possède déjà.
 * @returns {{ok: true, payload: Object}|{ok: false, error: string}}
 */
function parseBackup(text) {
    let raw;
    try {
        raw = JSON.parse(text);
    } catch (e) {
        return { ok: false, error: 'Fichier illisible : ce n\'est pas un JSON valide.' };
    }
    if (!isPlainObject(raw)) {
        return { ok: false, error: 'Fichier invalide : objet JSON attendu.' };
    }

    // Ancien format : { exercices: [...], plans: [...] }
    if (Array.isArray(raw.exercices) || Array.isArray(raw.plans)) {
        return {
            ok: true,
            payload: {
                format: BACKUP_FORMAT,
                version: 0,
                data: {
                    exercices: Array.isArray(raw.exercices) ? raw.exercices : [],
                    plans: Array.isArray(raw.plans) ? raw.plans : []
                },
                sessions: [],
                history: {},
                logs: {},
                settings: {}
            }
        };
    }

    if (!isPlainObject(raw.data)) {
        return { ok: false, error: 'Fichier invalide : aucune donnée d\'entraînement trouvée.' };
    }
    const exercices = Array.isArray(raw.data.exercices) ? raw.data.exercices : [];
    const plans = Array.isArray(raw.data.plans) ? raw.data.plans : [];
    if (exercices.length === 0 && plans.length === 0) {
        return { ok: false, error: 'Fichier invalide : la sauvegarde ne contient ni exercice ni programme.' };
    }

    return {
        ok: true,
        payload: {
            format: BACKUP_FORMAT,
            version: toNumber(raw.version, 0),
            exportedAt: raw.exportedAt || null,
            data: { exercices: exercices, plans: plans },
            sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
            history: isPlainObject(raw.history) ? raw.history : {},
            logs: isPlainObject(raw.logs) ? raw.logs : {},
            settings: isPlainObject(raw.settings) ? raw.settings : {}
        }
    };
}

/**
 * Fusionne deux bases : les entrées entrantes écrasent celles de même id,
 * les entrées locales absentes de la sauvegarde sont conservées.
 */
function mergeDb(base, incoming) {
    const result = {
        exercices: Array.isArray(base && base.exercices) ? base.exercices.slice() : [],
        plans: Array.isArray(base && base.plans) ? base.plans.slice() : []
    };

    ['exercices', 'plans'].forEach(cle => {
        const entrants = Array.isArray(incoming && incoming[cle]) ? incoming[cle] : [];
        const index = new Map(result[cle].map((item, i) => [String(item && item.id), i]));
        entrants.forEach(item => {
            if (!item || item.id === undefined || item.id === null) return;
            const id = String(item.id);
            if (index.has(id)) {
                result[cle][index.get(id)] = item;
            } else {
                index.set(id, result[cle].length);
                result[cle].push(item);
            }
        });
    });

    return result;
}

/** Fusionne deux journaux de performance en dédoublonnant par date. */
function mergeLogs(base, incoming) {
    const result = {};
    const cles = new Set(Object.keys(base || {}).concat(Object.keys(incoming || {})));
    cles.forEach(cle => {
        const a = Array.isArray(base && base[cle]) ? base[cle] : [];
        const b = Array.isArray(incoming && incoming[cle]) ? incoming[cle] : [];
        const vues = new Set();
        const fusion = [];
        a.concat(b).forEach(entry => {
            if (!entry) return;
            const signature = `${entry.date}|${entry.volume}`;
            if (vues.has(signature)) return;
            vues.add(signature);
            fusion.push(entry);
        });
        fusion.sort((x, y) => new Date(x.date) - new Date(y.date));
        result[cle] = fusion.slice(-LOG_LIMIT_PER_EX);
    });
    return result;
}

/** Fusionne deux historiques de séances en dédoublonnant par date + programme. */
function mergeSessions(base, incoming) {
    const vues = new Set();
    const fusion = [];
    (Array.isArray(base) ? base : []).concat(Array.isArray(incoming) ? incoming : []).forEach(s => {
        if (!s || !s.date) return;
        const signature = `${s.date}|${s.planId || ''}`;
        if (vues.has(signature)) return;
        vues.add(signature);
        fusion.push(s);
    });
    fusion.sort((x, y) => new Date(x.date) - new Date(y.date));
    return fusion.slice(-SESSION_LIMIT);
}

/** Photographie l'état courant pour permettre une annulation. */
function takeSnapshot(label) {
    const snap = buildBackup();
    snap.label = label || '';
    snap.takenAt = Date.now();
    return writeJSON(STORE_KEYS.snapshot, snap);
}

function readSnapshot() {
    return readJSON(STORE_KEYS.snapshot, null);
}

/**
 * Applique une sauvegarde.
 * @param {Object} payload résultat de parseBackup
 * @param {'replace'|'merge'} mode
 */
function applyBackup(payload, mode) {
    if (!payload || !payload.data) return { ok: false, error: 'invalid' };

    const fusion = mode === 'merge';
    const dataCourante = readJSON(STORE_KEYS.data, { exercices: [], plans: [] });

    const data = fusion ? mergeDb(dataCourante, payload.data) : payload.data;
    const sessions = fusion ? mergeSessions(readSessions(), payload.sessions) : (payload.sessions || []);
    const logs = fusion ? mergeLogs(readLogs(), payload.logs) : (payload.logs || {});
    const history = fusion
        ? Object.assign({}, readJSON(STORE_KEYS.history, {}), payload.history || {})
        : (payload.history || {});

    const ecritures = [
        writeJSON(STORE_KEYS.data, data),
        writeJSON(STORE_KEYS.sessions, sessions),
        writeJSON(STORE_KEYS.logs, logs),
        writeJSON(STORE_KEYS.history, history)
    ];

    const echec = ecritures.find(r => !r.ok);
    if (echec) return echec;

    const settings = payload.settings || {};
    try {
        if (settings.syncUrl) localStorage.setItem(STORE_KEYS.syncUrl, settings.syncUrl);
        if (settings.soundPref !== null && settings.soundPref !== undefined) {
            localStorage.setItem(STORE_KEYS.soundPref, settings.soundPref);
        }
        if (settings.prefillPref !== null && settings.prefillPref !== undefined) {
            localStorage.setItem(STORE_KEYS.prefillPref, settings.prefillPref);
        }
    } catch (e) {
        console.warn('Réglages non restaurés.', e);
    }

    return { ok: true, data: data };
}

/** Estimation de l'espace occupé dans le localStorage, en Ko. */
function storageUsageKo() {
    try {
        let total = 0;
        Object.keys(STORE_KEYS).forEach(nom => {
            const valeur = localStorage.getItem(STORE_KEYS[nom]);
            if (valeur) total += valeur.length;
        });
        return Math.round(total / 1024);
    } catch (e) {
        return 0;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORE_KEYS,
        BACKUP_FORMAT,
        LOG_LIMIT_PER_EX,
        safeParse,
        dayKey,
        daysBetween,
        relativeDay,
        formatDuration,
        normalizeSets,
        computeVolume,
        volumeUnit,
        formatPerf,
        suggestTarget,
        computeStreak,
        parseBackup,
        mergeDb,
        mergeLogs,
        mergeSessions
    };
}
