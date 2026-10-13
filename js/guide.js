/**
 * Séance guidée de FitTrack Pro : l'application mène la séance à votre place.
 *
 * Plus besoin de valider chaque série, de lancer chaque minuteur ni de compter
 * ses répétitions : l'application annonce l'exercice, rythme et compte les
 * répétitions à voix haute, chronomètre les maintiens, alterne contraction et
 * relâchement, fait changer de côté, enchaîne le repos puis l'exercice suivant.
 * Le téléphone peut rester posé : la voix, les bips et les vibrations guident.
 *
 * Le fichier a deux parties :
 *  - des fonctions pures (déroulé d'une série, textes, durées), testées sous Node ;
 *  - le lecteur, qui s'appuie sur l'état global de js/app.js (`currentWorkout`)
 *    et sur js/coach.js (journalisation des séries, sauvegarde de la séance).
 *
 * Ce fichier est chargé après js/coach.js.
 */

/* ------------------------------------------------------------------ */
/* Réglages                                                            */
/* ------------------------------------------------------------------ */

/** Rythme par défaut d'une répétition, en secondes. */
const GUIDE_DEFAULT_TEMPO = 3;
const GUIDE_MIN_TEMPO = 1.5;
const GUIDE_MAX_TEMPO = 10;
/** Annonce d'un nouvel exercice, en secondes. */
const GUIDE_PREPARE_SECS = 5;
/** Mise en place avant une nouvelle série du même exercice. */
const GUIDE_READY_SECS = 3;
/** Temps laissé pour changer de côté sur un exercice unilatéral. */
const GUIDE_SWITCH_SECS = 5;
/** Garde-fou : une série ne dépasse jamais ce nombre de répétitions guidées. */
const GUIDE_MAX_REPS = 200;

const GUIDE_KEYS = {
    guided: 'fitness_guided_pref',
    voice: 'fitness_voice_pref'
};

/* ------------------------------------------------------------------ */
/* Fonctions pures                                                     */
/* ------------------------------------------------------------------ */

function guideType(ex) {
    const t = ex && ex.type;
    return ['reps', 'secs', 'kegel', 'poids', 'distance'].includes(t) ? t : 'reps';
}

/** Rythme d'une répétition pour cet exercice (champ `tempo`, en secondes). */
function guideTempo(ex) {
    const t = parseFloat(ex && ex.tempo);
    if (!Number.isFinite(t)) return GUIDE_DEFAULT_TEMPO;
    return Math.min(GUIDE_MAX_TEMPO, Math.max(GUIDE_MIN_TEMPO, t));
}

function guideCount(value, fallback) {
    const n = Math.round(parseFloat(value));
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Côtés à travailler pour une série : un seul, ou gauche puis droit. */
function guideSides(ex) {
    return ex && ex.unilateral && guideType(ex) !== 'kegel' ? ['gauche', 'droit'] : [null];
}

/**
 * Déroulé complet d'une série, étape par étape.
 * @param {Object} ex - exercice de la séance
 * @param {Object} [opts]
 * @param {number} [opts.prepareSecs=0] - annonce avant la série (0 = aucune)
 * @returns {Array<Object>} étapes `{kind, secs, ...}` ; `secs: null` = attend l'utilisateur
 */
function buildSetSteps(ex, opts = {}) {
    const type = guideType(ex);
    const steps = [];
    const prepareSecs = Math.max(0, parseFloat(opts.prepareSecs) || 0);
    if (prepareSecs > 0) steps.push({ kind: 'prepare', secs: prepareSecs });

    guideSides(ex).forEach((side, i) => {
        if (i > 0) steps.push({ kind: 'switch', secs: GUIDE_SWITCH_SECS, side });

        if (type === 'secs') {
            steps.push({ kind: 'hold', secs: guideCount(ex.valeur, 30), side });
        } else if (type === 'kegel') {
            const total = Math.min(GUIDE_MAX_REPS, guideCount(ex.valeur, 10));
            const on = guideCount(ex.kegel_on, 5);
            const off = guideCount(ex.kegel_off, 5);
            for (let c = 1; c <= total; c++) {
                steps.push({ kind: 'contract', secs: on, cycle: c, total });
                steps.push({ kind: 'relax', secs: off, cycle: c, total });
            }
        } else if (type === 'distance') {
            // Impossible à chronométrer à la place de l'utilisateur.
            steps.push({ kind: 'manual', secs: null, side });
        } else {
            const total = Math.min(GUIDE_MAX_REPS, guideCount(ex.valeur, 10));
            const tempo = guideTempo(ex);
            for (let r = 1; r <= total; r++) {
                steps.push({ kind: 'rep', secs: tempo, rep: r, total, side });
            }
        }
    });

    return steps;
}

/** Durée d'une série, sans annonce (les étapes manuelles comptent pour 0). */
function setDuration(ex) {
    return buildSetSteps(ex).reduce((acc, s) => acc + (s.secs || 0), 0);
}

/**
 * Estimation de la durée totale d'une séance guidée, en secondes, selon les
 * mêmes règles que le lecteur (annonces, repos, mises en place).
 */
function estimateWorkoutDuration(exercices) {
    if (!Array.isArray(exercices)) return 0;
    if (exercices.length === 0) return 0;
    let total = GUIDE_PREPARE_SECS;
    exercices.forEach((ex, i) => {
        const series = guideCount(ex.series, 1);
        const repos = Math.max(0, parseFloat(ex.repos) || 0);
        total += series * setDuration(ex);
        // Entre deux séries : le repos, ou une courte mise en place s'il est trop bref.
        total += (series - 1) * (repos >= GUIDE_READY_SECS ? repos : repos + GUIDE_READY_SECS);
        // Avant l'exercice suivant : le repos, dont l'annonce fait partie.
        if (i < exercices.length - 1) total += Math.max(repos, GUIDE_PREPARE_SECS);
    });
    return Math.round(total);
}

/** « ~14 min », ou « < 1 min ». */
function formatEstimate(secs) {
    if (!(secs > 0)) return '';
    const min = Math.round(secs / 60);
    return min < 1 ? '< 1 min' : `~${min} min`;
}

/** Objectif d'un exercice, dit ou affiché : « 3 séries de 10 répétitions ». */
function describeTarget(ex) {
    const type = guideType(ex);
    const series = guideCount(ex.series, 1);
    const val = ex.valeur;
    let what;
    if (type === 'secs') what = `${guideCount(val, 30)} secondes de maintien`;
    else if (type === 'kegel') what = `${guideCount(val, 10)} cycles`;
    else if (type === 'distance') what = `${val} kilomètres`;
    else what = `${guideCount(val, 10)} répétitions`;
    let txt = `${series} série${series > 1 ? 's' : ''} de ${what}`;
    if (type === 'poids' && parseFloat(ex.poids) > 0) txt += ` à ${ex.poids} kilos`;
    if (ex.unilateral && type !== 'kegel') txt += ', de chaque côté';
    return txt;
}

/**
 * Quantité réellement réalisée dans une série interrompue (répétitions,
 * secondes ou cycles), d'après les étapes déjà terminées.
 * @param {Array} steps - déroulé de la série
 * @param {number} index - étape en cours
 * @param {number} elapsedInStep - secondes écoulées dans l'étape en cours
 */
function doneInSet(steps, index, elapsedInStep = 0) {
    let reps = 0, secs = 0, cycles = 0, sides = 0;
    steps.forEach((s, i) => {
        if (s.kind === 'switch' && i < index) sides++;
        if (i < index) {
            if (s.kind === 'rep') reps++;
            if (s.kind === 'hold') secs += s.secs;
            if (s.kind === 'relax') cycles++;
        } else if (i === index && s.kind === 'hold') {
            secs += Math.floor(Math.max(0, elapsedInStep));
        }
    });
    // Sur un exercice unilatéral, on retient la moyenne par côté entamé.
    const cotes = sides + 1;
    if (reps) return Math.floor(reps / cotes);
    if (secs) return Math.floor(secs / cotes);
    return cycles;
}

/* ------------------------------------------------------------------ */
/* Préférences                                                         */
/* ------------------------------------------------------------------ */

function guideReadPref(key) {
    try {
        return localStorage.getItem(key) !== '0';
    } catch (e) {
        return true;
    }
}

function guideWritePref(key, on) {
    try {
        localStorage.setItem(key, on ? '1' : '0');
    } catch (e) {
        if (typeof showError === 'function') showError("Préférence non sauvegardée : stockage indisponible.");
    }
}

function guideEnabled() { return guideReadPref(GUIDE_KEYS.guided); }
function guideVoiceEnabled() { return guideReadPref(GUIDE_KEYS.voice); }

/* ------------------------------------------------------------------ */
/* Lecteur (navigateur uniquement)                                     */
/* ------------------------------------------------------------------ */

/** Facteur de vitesse : les tests de bout en bout l'abaissent pour aller vite. */
let guideTimeScale = 1;

const guide = {
    active: false,     // le lecteur pilote l'écran de séance
    steps: [],         // étapes de la phase en cours (série ou repos)
    index: 0,
    elapsed: 0,        // secondes écoulées dans l'étape en cours
    phase: 'set',      // 'set' | 'rest'
    paused: false,
    timer: null,
    last: 0,
    lastSecondCue: null,
    nextPrepare: null, // annonce à prévoir au prochain démarrage de série
    sessionOff: false, // guidage coupé pour cette séance uniquement
    wakeLock: null,
    menuWasPaused: false
};

function guideEl(id) { return document.getElementById(id); }

/** Appelée par renderWorkoutStep() : true si le lecteur prend la main. */
function guideTakeOver() {
    if (!guideEnabled() || guide.sessionOff) {
        guideShowViews(false);
        return false;
    }
    const prepare = guide.nextPrepare === null ? GUIDE_PREPARE_SECS : guide.nextPrepare;
    guide.nextPrepare = null;
    guideStartSet(prepare);
    return true;
}

function guideCurrentEx() {
    return currentWorkout && currentWorkout.exercices
        ? currentWorkout.exercices[currentWorkout.currentExIndex]
        : null;
}

function guideShowViews(on) {
    const show = (id, display) => { const el = guideEl(id); if (el) el.style.display = display; };
    show('guided-view', on ? 'flex' : 'none');
    show('guided-controls', on ? 'flex' : 'none');
    if (on) {
        show('workout-ex-view', 'none');
        show('workout-rest-view', 'none');
        show('workout-end-view', 'none');
    }
    // Le mode manuel retrouve ses boutons (passage en manuel en pleine séance)
    show('workout-controls', on ? 'none' : 'block');
}

function guideStartSet(prepareSecs) {
    const ex = guideCurrentEx();
    if (!ex) return;
    guide.active = true;
    guide.phase = 'set';
    guide.steps = buildSetSteps(ex, { prepareSecs });
    guideShowViews(true);
    guideAcquireWakeLock();
    coachSaveActive();
    guideEnterStep(0);
    guideStartClock();
}

function guideStartRest(secs, nextIsNewExercise) {
    guide.phase = 'rest';
    guide.steps = [{ kind: 'rest', secs, newExercise: nextIsNewExercise }];
    guideEnterStep(0);
}

function guideStartClock() {
    guideStopClock();
    guide.paused = false;
    guide.last = Date.now();
    guide.timer = setInterval(guideTick, 100);
    guideRenderPause();
}

function guideStopClock() {
    if (guide.timer) clearInterval(guide.timer);
    guide.timer = null;
}

/** Arrête complètement le lecteur (fin de séance, sortie, passage en manuel). */
function guideStop() {
    guideStopClock();
    guide.active = false;
    guide.paused = false;
    guide.steps = [];
    guide.nextPrepare = null;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    guideReleaseWakeLock();
    const view = guideEl('guided-view');
    if (view) view.style.display = 'none';
    const ctrl = guideEl('guided-controls');
    if (ctrl) ctrl.style.display = 'none';
}

function guideTick() {
    const now = Date.now();
    const delta = (now - guide.last) / 1000 / guideTimeScale;
    guide.last = now;
    if (guide.paused || !guide.active) return;

    const step = guide.steps[guide.index];
    if (!step || step.secs === null) return; // étape manuelle : on attend l'utilisateur

    guide.elapsed += delta;
    const left = step.secs - guide.elapsed;

    // Décompte « 3, 2, 1 » à la fin des attentes et des maintiens
    const sec = Math.ceil(left);
    if (sec !== guide.lastSecondCue && sec > 0 && sec <= 3
        && ['prepare', 'rest', 'switch', 'hold'].includes(step.kind) && step.secs > 3) {
        guide.lastSecondCue = sec;
        playBeep(600, 0.08);
        // Le décompte ne coupe jamais une annonce (nom de l'exercice, consigne)
        if (step.kind !== 'hold') guideSay(String(sec), { ifIdle: true });
    }
    if (step.kind === 'hold' && step.secs >= 20 && sec === 10 && guide.lastSecondCue !== 10) {
        guide.lastSecondCue = 10;
        guideSay('Encore 10 secondes');
    }

    if (left <= 0) {
        guideNextStep();
    } else {
        guideRenderProgress(step, left);
    }
}

function guideNextStep() {
    if (guide.index + 1 < guide.steps.length) {
        guideEnterStep(guide.index + 1);
    } else if (guide.phase === 'set') {
        guideFinishSet(null);
    } else {
        guideFinishRest();
    }
}

/** Entrée dans une étape : annonce vocale, bip, vibration, affichage. */
function guideEnterStep(index) {
    guide.index = index;
    guide.elapsed = 0;
    guide.lastSecondCue = null;
    const step = guide.steps[index];
    const ex = guideCurrentEx();
    if (!step || !ex) return;

    switch (step.kind) {
        case 'prepare':
            guideSay(`${ex.nom}. ${describeTarget(ex)}.${ex.unilateral && guideType(ex) !== 'kegel' ? ' On commence à gauche.' : ''}`);
            break;
        case 'switch':
            playBeep(500, 0.2);
            guideVibrate([150, 80, 150]);
            guideSay('Changez de côté');
            break;
        case 'hold':
            playBeep(700, 0.25);
            guideVibrate(200);
            guideSay(step.side ? `Tenez, côté ${step.side}` : 'Tenez');
            break;
        case 'contract':
            playBeep(700, 0.15);
            guideVibrate(120);
            guideSay('Contractez');
            break;
        case 'relax':
            playBeep(420, 0.15);
            guideSay('Relâchez');
            break;
        case 'rep':
            if (guideVoiceEnabled() && 'speechSynthesis' in window) {
                guideSay(String(step.rep));
            } else {
                playBeep(500 + Math.min(step.rep, 20) * 15, 0.08, 'triangle');
            }
            if (step.rep === step.total) guideVibrate(80);
            break;
        case 'manual':
            playBeep(600, 0.2);
            guideSay("À vous. Touchez « J'ai terminé » une fois fini.");
            break;
        case 'rest': {
            playBeep(400, 0.15);
            guideVibrate([100, 60, 100]);
            const next = guideCurrentEx();
            const suite = step.newExercise && next ? ` Ensuite : ${next.nom}.` : '';
            guideSay(`Repos, ${Math.round(step.secs)} secondes.${suite}`);
            break;
        }
    }
    guideRender();
}

/**
 * Fin d'une série. `done` vaut null si la série est allée à son terme, sinon
 * la quantité réalisée avant que l'utilisateur ne l'écourte.
 */
function guideFinishSet(done) {
    const ex = guideCurrentEx();
    if (!ex) return;

    if (done === null || done > 0) {
        coachRecordSet(ex);
        if (done !== null && done < (parseFloat(ex.valeur) || 0)) {
            const perf = currentWorkout.perf && currentWorkout.perf[coachPerfKey(ex)];
            if (perf && perf.sets.length) perf.sets[perf.sets.length - 1].valeur = done;
            coachSaveActive();
        }
    }
    currentWorkout.currentSet++;

    const repos = Math.max(0, parseFloat(ex.repos) || 0);
    const derniereSerie = currentWorkout.currentSet >= guideCount(ex.series, 1);

    if (derniereSerie) {
        currentWorkout.currentExIndex++;
        currentWorkout.currentSet = 0;
        if (currentWorkout.currentExIndex >= currentWorkout.exercices.length) {
            guideFinishWorkout();
            return;
        }
    }
    coachSaveActive();

    // Un nouvel exercice est toujours annoncé ; l'annonce est prise sur le
    // repos prévu, pour ne pas allonger la séance.
    const annonce = derniereSerie ? GUIDE_PREPARE_SECS : (repos >= GUIDE_READY_SECS ? 0 : GUIDE_READY_SECS);
    const pause = derniereSerie ? Math.max(0, repos - GUIDE_PREPARE_SECS) : repos;
    if (pause > 0) {
        guide.nextPrepare = annonce;
        guideStartRest(pause, derniereSerie);
    } else {
        guideStartSet(annonce);
    }
}

function guideFinishRest() {
    const prepare = guide.nextPrepare === null ? GUIDE_READY_SECS : guide.nextPrepare;
    guide.nextPrepare = null;
    guideStartSet(prepare);
}

function guideFinishWorkout() {
    currentWorkout.currentExIndex = currentWorkout.exercices.length - 1;
    guideStop();
    playBeep(800, 0.5);
    guideVibrate([200, 100, 200, 100, 300]);
    guideSay('Séance terminée. Bravo !', { force: true });
    showWorkoutEnd();
}

/* ---------- Commandes ---------- */

/** Bouton principal : pause / reprise, ou « J'ai terminé » sur une étape manuelle. */
function guideMainAction() {
    triggerHaptic();
    const step = guide.steps[guide.index];
    if (step && step.secs === null && !guide.paused) {
        guideNextStep();
        return;
    }
    guideTogglePause();
}

function guideTogglePause(forceState) {
    guide.paused = typeof forceState === 'boolean' ? forceState : !guide.paused;
    guide.last = Date.now();
    if (guide.paused) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    } else {
        guideSay('On reprend');
    }
    guideRenderPause();
    guideRender();
}

/** Bouton « Passer » : saute l'attente, ou écourte la série en cours. */
function guideSkip() {
    triggerHaptic();
    const step = guide.steps[guide.index];
    if (!step) return;
    if (guide.paused) guideTogglePause(false);

    if (guide.phase === 'rest') {
        guideFinishRest();
    } else if (step.kind === 'prepare' || step.kind === 'switch') {
        guideNextStep();
    } else if (step.kind === 'manual') {
        guideFinishSet(null);
    } else {
        const done = doneInSet(guide.steps, guide.index, guide.elapsed);
        const ex = guideCurrentEx();
        const complet = done >= guideCount(ex && ex.valeur, 0) && guideType(ex) !== 'distance';
        guideFinishSet(complet ? null : done);
    }
}

/** Ajuste le rythme des répétitions, pour la séance et pour les suivantes. */
function guideAdjustTempo(delta) {
    triggerHaptic();
    const ex = guideCurrentEx();
    if (!ex) return;
    const tempo = Math.round(Math.min(GUIDE_MAX_TEMPO, Math.max(GUIDE_MIN_TEMPO, guideTempo(ex) + delta)) * 2) / 2;
    ex.tempo = tempo;
    guide.steps.forEach((s, i) => { if (s.kind === 'rep' && i > guide.index) s.secs = tempo; });

    // Mémorisé dans la bibliothèque : la prochaine séance garde ce rythme.
    const source = db && db.exercices ? db.exercices.find(e => String(e.id) === String(ex.id)) : null;
    if (source) {
        source.tempo = tempo;
        coachSaveDb();
    }
    coachSaveActive();
    guideRender();
}

function guideOpenMenu() {
    triggerHaptic();
    guide.menuWasPaused = guide.paused;
    guideTogglePause(true);
    const voice = guideEl('guide-menu-voice');
    if (voice) voice.textContent = guideVoiceEnabled() ? '🔇 Couper la voix' : '🔊 Activer la voix';
    guideEl('modal-guide-menu').classList.add('active');
}

function guideCloseMenu(event, keepPaused) {
    if (event && event.target !== guideEl('modal-guide-menu') && event.target.className !== 'close-btn') return;
    guideEl('modal-guide-menu').classList.remove('active');
    if (!keepPaused && !guide.menuWasPaused && guide.active) guideTogglePause(false);
}

/** Lance une action du menu après l'avoir refermé (les actions redessinent l'écran). */
function guideMenuAction(action) {
    guideCloseMenu(null, true);
    switch (action) {
        case 'skip-ex':
            skipCurrentExercice();
            break;
        case 'later':
            delayCurrentExercice();
            break;
        case 'queue':
            openWorkoutQueue();
            break;
        case 'edit':
            openEditCurrentEx();
            break;
        case 'voice':
            guideWritePref(GUIDE_KEYS.voice, !guideVoiceEnabled());
            updateGuidePrefsUI();
            break;
        case 'manual':
            guide.sessionOff = true;
            guideStop();
            currentWorkout.isResting = false;
            renderWorkoutStep();
            showSuccess("Mode manuel : validez vous-même chaque série.");
            return;
        case 'quit':
            quitWorkout();
            return;
    }
    // Les actions qui ne redessinent pas l'écran laissent la séance en pause.
    guideRender();
}

/* ---------- Sorties : voix, vibrations, écran ---------- */

let guideFrVoice;
function guidePickVoice() {
    if (guideFrVoice !== undefined || !window.speechSynthesis) return guideFrVoice;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    guideFrVoice = voices.find(v => /^fr[-_]CA/i.test(v.lang))
        || voices.find(v => /^fr/i.test(v.lang))
        || null;
    return guideFrVoice;
}

function guideSay(text, opts = {}) {
    if (!text || !guideVoiceEnabled() || !('speechSynthesis' in window)) return;
    if (guide.paused && !opts.force) return;
    try {
        if (opts.ifIdle && window.speechSynthesis.speaking) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'fr-FR';
        const v = guidePickVoice();
        if (v) { u.voice = v; u.lang = v.lang; }
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
    } catch (e) {
        // La synthèse vocale est un confort : son absence ne bloque jamais la séance.
    }
}

function guideVibrate(pattern) {
    if (navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch (e) { /* non supporté */ }
    }
}

/** Empêche l'écran de se mettre en veille pendant la séance. */
async function guideAcquireWakeLock() {
    if (guide.wakeLock || !('wakeLock' in navigator)) return;
    try {
        guide.wakeLock = await navigator.wakeLock.request('screen');
        guide.wakeLock.addEventListener('release', () => { guide.wakeLock = null; });
    } catch (e) {
        guide.wakeLock = null;
    }
}

function guideReleaseWakeLock() {
    if (guide.wakeLock) {
        guide.wakeLock.release().catch(() => {});
        guide.wakeLock = null;
    }
}

/* ---------- Affichage ---------- */

const GUIDE_RING = 691; // 2πr, r = 110

const GUIDE_LABELS = {
    prepare: 'Préparez-vous',
    switch: 'Changez de côté',
    hold: 'Tenez',
    contract: 'Contractez',
    relax: 'Relâchez',
    rep: 'Répétition',
    manual: 'À vous',
    rest: 'Repos'
};

function guideRender() {
    const ex = guideCurrentEx();
    const step = guide.steps[guide.index];
    if (!ex || !step || !guide.active) return;

    const view = guideEl('guided-view');
    view.dataset.kind = step.kind;
    view.classList.toggle('is-paused', guide.paused);

    // Pendant le repos, on présente l'exercice qui vient.
    guideEl('guided-ex-name').textContent = ex.nom;

    const progress = guideEl('workout-progress');
    if (progress) progress.textContent = `${currentWorkout.currentExIndex + 1} / ${currentWorkout.exercices.length}`;

    const series = guideCount(ex.series, 1);
    const parts = [];
    if (guide.phase === 'rest' && currentWorkout.currentSet === 0) {
        parts.push(`À suivre : ${describeTarget(ex)}`);
    } else if (guide.phase === 'rest') {
        parts.push(`Avant la série ${currentWorkout.currentSet + 1}/${series}`);
    } else {
        parts.push(`Série ${currentWorkout.currentSet + 1}/${series}`);
        if (step.side) parts.push(`côté ${step.side}`);
        if (guideType(ex) === 'poids' && parseFloat(ex.poids) > 0) parts.push(`${ex.poids} kg`);
    }
    guideEl('guided-sub').textContent = parts.join(' · ');

    let phase = GUIDE_LABELS[step.kind] || '';
    if (step.kind === 'hold' && step.side) phase = `Tenez · côté ${step.side}`;
    guideEl('guided-phase').textContent = guide.paused ? 'En pause' : phase;

    // Rythme : seulement pour les répétitions
    const tempoBox = guideEl('guided-tempo');
    const hasReps = guide.phase === 'set' && guide.steps.some(s => s.kind === 'rep');
    tempoBox.style.display = hasReps ? 'flex' : 'none';
    if (hasReps) guideEl('guided-tempo-value').textContent = `${String(guideTempo(ex)).replace('.', ',')} s / rép.`;

    guideEl('guided-desc').textContent = ex.description || '';

    // « Ensuite »
    const nextEl = guideEl('guided-next');
    const suivant = currentWorkout.exercices[currentWorkout.currentExIndex + 1];
    nextEl.textContent = suivant ? `Ensuite : ${suivant.nom}` : 'Dernier exercice';

    guideRenderProgress(step, step.secs === null ? null : step.secs - guide.elapsed);
    guideRenderPause();
}

function guideRenderProgress(step, left) {
    const big = guideEl('guided-big');
    const unit = guideEl('guided-big-unit');
    const ring = guideEl('guided-ring-progress');
    if (!big || !ring) return;

    let fraction = 0;
    if (step.kind === 'rep') {
        big.textContent = step.rep;
        unit.textContent = `sur ${step.total}`;
        // L'anneau suit la série ; il avance en continu pendant la répétition.
        const inRep = step.secs ? Math.min(1, guide.elapsed / step.secs) : 0;
        fraction = (step.rep - 1 + inRep) / step.total;
    } else if (step.kind === 'contract' || step.kind === 'relax') {
        big.textContent = Math.max(1, Math.ceil(left));
        unit.textContent = `cycle ${step.cycle}/${step.total}`;
        fraction = step.secs ? Math.min(1, guide.elapsed / step.secs) : 0;
    } else if (step.secs === null) {
        big.textContent = '✓';
        unit.textContent = "quand c'est fait";
        fraction = 0;
    } else {
        big.textContent = Math.max(0, Math.ceil(left));
        unit.textContent = 'secondes';
        fraction = step.secs ? Math.min(1, guide.elapsed / step.secs) : 0;
    }
    ring.style.strokeDashoffset = String(GUIDE_RING * (1 - fraction));
}

function guideRenderPause() {
    const btn = guideEl('guided-btn-main');
    if (!btn) return;
    const step = guide.steps[guide.index];
    if (step && step.secs === null && !guide.paused) {
        btn.textContent = "✓ J'ai terminé";
    } else {
        btn.textContent = guide.paused ? '▶ Reprendre' : '⏸ Pause';
    }
    const skip = guideEl('guided-btn-skip');
    if (skip) {
        const enAttente = guide.phase === 'rest' || (step && (step.kind === 'prepare' || step.kind === 'switch'));
        skip.textContent = enAttente ? '⏭ Passer' : '⏭ Finir la série';
    }
}

/* ---------- Préférences (écran Paramètres) ---------- */

function toggleGuidedPref() {
    guideWritePref(GUIDE_KEYS.guided, guideEl('toggle-guided').checked);
    updateGuidePrefsUI();
}

function toggleVoicePref() {
    guideWritePref(GUIDE_KEYS.voice, guideEl('toggle-voice').checked);
    updateGuidePrefsUI();
    if (guideVoiceEnabled()) guideSay('Guidage vocal activé', { force: true });
}

function updateGuidePrefsUI() {
    [['toggle-guided', 'guided-slider', 'guided-knob', guideEnabled()],
     ['toggle-voice', 'voice-slider', 'voice-knob', guideVoiceEnabled()]].forEach(([cb, sl, kn, on]) => {
        const checkbox = guideEl(cb), slider = guideEl(sl), knob = guideEl(kn);
        if (!checkbox || !slider || !knob) return;
        checkbox.checked = on;
        slider.style.backgroundColor = on ? 'var(--accent-color)' : 'var(--surface-hover)';
        slider.style.borderColor = on ? 'var(--accent-color)' : 'var(--border-color)';
        knob.style.backgroundColor = on ? '#000' : 'var(--text-secondary)';
        knob.style.transform = on ? 'translateX(20px)' : 'translateX(0)';
    });
}

/* ---------- Initialisation ---------- */

function initGuide() {
    updateGuidePrefsUI();
    if (window.speechSynthesis) {
        guidePickVoice();
        window.speechSynthesis.onvoiceschanged = () => { guideFrVoice = undefined; guidePickVoice(); };
    }
    // Téléphone verrouillé, appel, autre application : on met en pause
    // plutôt que de laisser la séance défiler sans vous.
    document.addEventListener('visibilitychange', () => {
        if (!guide.active) return;
        if (document.hidden) {
            if (!guide.paused) guideTogglePause(true);
        } else {
            guideAcquireWakeLock();
        }
    });
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGuide);
    } else {
        initGuide();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GUIDE_DEFAULT_TEMPO,
        GUIDE_PREPARE_SECS,
        GUIDE_SWITCH_SECS,
        guideTempo,
        guideSides,
        buildSetSteps,
        setDuration,
        estimateWorkoutDuration,
        formatEstimate,
        describeTarget,
        doneInSet
    };
}
