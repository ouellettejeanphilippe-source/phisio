/**
 * Écran « Aujourd'hui » de FitTrack Pro : l'accueil de l'application.
 *
 * Il répond à une seule question — « qu'est-ce que je fais aujourd'hui ? » —
 * et permet de lancer la séance guidée en un geste :
 *  - le programme du jour (« Routine Mardi » le mardi), ou à défaut celui
 *    qu'on n'a pas fait depuis le plus longtemps ;
 *  - la semaine en pastilles (fait / manqué / aujourd'hui / à venir) ;
 *  - quelques chiffres de régularité et la dernière séance avec son ressenti ;
 *  - des raccourcis (Kegel express, séance libre, tous les programmes).
 *
 * Fonctions pures en tête (testées sous Node), rendu ensuite. Chargé après
 * js/guide.js, dont il utilise l'estimation de durée.
 */

/* ------------------------------------------------------------------ */
/* Fonctions pures                                                     */
/* ------------------------------------------------------------------ */

/** Jours de la semaine, dans l'ordre de Date#getDay(). */
const TODAY_DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function todayNormalize(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

function todayDayKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Programme qui porte le nom d'un jour (« Routine Mardi »), ou null. */
function planForWeekday(plans, weekday) {
    const jour = TODAY_DAY_NAMES[weekday];
    const motif = new RegExp(`(^|[^a-z])${jour}([^a-z]|$)`);
    return (plans || []).find(p => motif.test(todayNormalize(p && p.nom))) || null;
}

/** Date de la dernière séance de chaque programme : { planId: Date }. */
function lastDoneByPlan(sessions) {
    const map = {};
    (sessions || []).forEach(s => {
        if (!s || s.planId === undefined || s.planId === null) return;
        const d = new Date(s.date);
        if (isNaN(d.getTime())) return;
        const cle = String(s.planId);
        if (!map[cle] || d > map[cle]) map[cle] = d;
    });
    return map;
}

/**
 * Programme à proposer aujourd'hui.
 * 1. Celui qui porte le nom du jour.
 * 2. Sinon, parmi les programmes qui ne sont pas liés à un jour, celui qu'on
 *    n'a jamais fait, ou fait il y a le plus longtemps (ordre de la liste en
 *    cas d'égalité).
 * @returns {{plan: Object, reason: 'jour'|'suggestion'}|null}
 */
function pickTodayPlan(plans, sessions, now) {
    const liste = (plans || []).filter(p => p && Array.isArray(p.exercices_ids) && p.exercices_ids.length > 0);
    if (liste.length === 0) return null;
    const ref = now ? new Date(now) : new Date();

    const duJour = planForWeekday(liste, ref.getDay());
    if (duJour) return { plan: duJour, reason: 'jour' };

    const lies = new Set(TODAY_DAY_NAMES.map((_, i) => planForWeekday(liste, i)).filter(Boolean));
    const candidats = liste.filter(p => !lies.has(p));
    const pool = candidats.length ? candidats : liste;
    const derniers = lastDoneByPlan(sessions);

    let choix = pool[0];
    pool.forEach(p => {
        const a = derniers[String(p.id)];
        const b = derniers[String(choix.id)];
        if (!a && b) choix = p;
        else if (a && b && a < b) choix = p;
    });
    return { plan: choix, reason: 'suggestion' };
}

/** Séances d'un jour donné. */
function sessionsOn(sessions, date) {
    const cle = todayDayKey(date);
    return (sessions || []).filter(s => s && todayDayKey(s.date) === cle);
}

/** Lundi de la semaine de `date`, à minuit. */
function startOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const decalage = (d.getDay() + 6) % 7; // lundi = 0
    d.setDate(d.getDate() - decalage);
    return d;
}

/**
 * La semaine en cours, du lundi au dimanche.
 * @returns {Array<{label: string, date: Date, state: 'done'|'missed'|'today'|'upcoming', count: number}>}
 */
function weekStrip(sessions, now) {
    const ref = now ? new Date(now) : new Date();
    const lundi = startOfWeek(ref);
    const cleAujourdhui = todayDayKey(ref);
    const lettres = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return lettres.map((label, i) => {
        const date = new Date(lundi);
        date.setDate(lundi.getDate() + i);
        const count = sessionsOn(sessions, date).length;
        const cle = todayDayKey(date);
        let state;
        if (count > 0) state = 'done';
        else if (cle === cleAujourdhui) state = 'today';
        else if (cle < cleAujourdhui) state = 'missed';
        else state = 'upcoming';
        return { label, date, state, count, isToday: cle === cleAujourdhui };
    });
}

/** Séances et minutes de la semaine en cours. */
function weekSummary(sessions, now) {
    const ref = now ? new Date(now) : new Date();
    const lundi = startOfWeek(ref);
    const dimancheSoir = new Date(lundi);
    dimancheSoir.setDate(lundi.getDate() + 7);

    const semaine = (sessions || []).filter(s => {
        const d = new Date(s && s.date);
        return !isNaN(d.getTime()) && d >= lundi && d < dimancheSoir;
    });
    const secondes = semaine.reduce((acc, s) => acc + (Number(s.dureeSec) || 0), 0);
    return {
        count: semaine.length,
        days: new Set(semaine.map(s => todayDayKey(s.date))).size,
        minutes: Math.round(secondes / 60)
    };
}

function greeting(now) {
    const h = (now ? new Date(now) : new Date()).getHours();
    if (h < 5) return 'Bonne nuit';
    if (h < 18) return 'Bonjour';
    return 'Bonsoir';
}

/* ------------------------------------------------------------------ */
/* Rendu (navigateur uniquement)                                       */
/* ------------------------------------------------------------------ */

/** Programme affiché en tête : celui du jour, ou celui choisi via « Changer ». */
let todayOverridePlanId = null;

function todayEsc(text) {
    return typeof escapeHtml === 'function' ? escapeHtml(String(text ?? '')) : String(text ?? '');
}

function todayPlanExercises(plan) {
    const map = new Map((db.exercices || []).map(e => [String(e.id), e]));
    return (plan.exercices_ids || []).map(id => map.get(String(id))).filter(Boolean);
}

function renderToday() {
    const root = document.getElementById('today-section');
    if (!root || typeof db === 'undefined' || !db) return;

    const now = new Date();
    const sessions = readSessions();

    // En-tête
    const date = now.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('today-date').textContent = date.charAt(0).toUpperCase() + date.slice(1);
    document.getElementById('today-greeting').textContent = greeting(now);
    const streak = computeStreak(sessions, now);
    const streakEl = document.getElementById('today-streak');
    streakEl.textContent = `🔥 ${streak}`;
    streakEl.title = `${streak} jour${streak > 1 ? 's' : ''} d'affilée`;
    streakEl.classList.toggle('is-off', streak === 0);

    renderTodayHero(sessions, now);
    renderTodayWeek(sessions, now);
    renderTodayStats(sessions, now, streak);
    renderTodayShortcuts();
    renderTodayLast(sessions);
}

function renderTodayHero(sessions, now) {
    const hero = document.getElementById('today-hero');
    const plans = db.plans || [];

    let choix = null;
    if (todayOverridePlanId) {
        const p = plans.find(x => String(x.id) === String(todayOverridePlanId));
        if (p) choix = { plan: p, reason: 'choix' };
    }
    if (!choix) choix = pickTodayPlan(plans, sessions, now);

    if (!choix) {
        hero.innerHTML = `
            <div class="today-eyebrow">Pour commencer</div>
            <h2 class="today-hero-title">Créez votre premier programme</h2>
            <p class="today-hero-desc">Ajoutez vos exercices et regroupez-les en programme : l'application vous guidera ensuite pas à pas.</p>
            <button type="button" class="today-cta" onclick="switchTab('plans')">Voir les programmes</button>`;
        return;
    }

    const { plan, reason } = choix;
    const exos = todayPlanExercises(plan);
    const duree = typeof estimateWorkoutDuration === 'function' ? formatEstimate(estimateWorkoutDuration(exos)) : '';
    const faitAujourdhui = sessionsOn(sessions, now).some(s => String(s.planId) === String(plan.id));

    const eyebrow = faitAujourdhui ? '✓ Fait aujourd\'hui'
        : reason === 'jour' ? 'Programme du jour'
        : reason === 'choix' ? 'Votre choix'
        : 'Suggestion du jour';

    const visibles = exos.slice(0, 4).map(e => `<li>${todayEsc(e.nom)}</li>`).join('');
    const reste = exos.length > 4 ? `<li class="more">+ ${exos.length - 4} autre${exos.length - 4 > 1 ? 's' : ''}</li>` : '';

    hero.classList.toggle('is-done', faitAujourdhui);
    hero.innerHTML = `
        <div class="today-eyebrow">${eyebrow}</div>
        <h2 class="today-hero-title">${todayEsc(plan.nom)}</h2>
        ${plan.description ? `<p class="today-hero-desc">${todayEsc(plan.description)}</p>` : ''}
        <div class="today-chips">
            ${duree ? `<span class="chip">⏱ ${duree}</span>` : ''}
            <span class="chip">${exos.length} exercice${exos.length > 1 ? 's' : ''}</span>
            <span class="chip">🎧 Guidé</span>
        </div>
        <ol class="today-exlist">${visibles}${reste}</ol>
        <button type="button" class="today-cta" id="today-start">${faitAujourdhui ? '↻ Refaire la séance' : '▶ Commencer'}</button>
        <div class="today-hero-links">
            <button type="button" id="today-details">Voir le détail</button>
            <button type="button" id="today-change">Changer de programme</button>
        </div>`;

    document.getElementById('today-start').onclick = () => startWorkout(plan);
    document.getElementById('today-details').onclick = () => openPlanDetails(plan);
    document.getElementById('today-change').onclick = () => openTodayPicker();
}

function renderTodayWeek(sessions, now) {
    const box = document.getElementById('today-week');
    const titres = { done: 'Séance faite', missed: 'Pas de séance', today: "Aujourd'hui", upcoming: 'À venir' };
    box.innerHTML = weekStrip(sessions, now).map(j => `
        <div class="week-day is-${j.state}${j.isToday ? ' is-current' : ''}" title="${titres[j.state]}">
            <span class="week-label">${j.label}</span>
            <span class="week-dot">${j.state === 'done' ? '✓' : j.date.getDate()}</span>
        </div>`).join('');
}

function renderTodayStats(sessions, now, streak) {
    const s = weekSummary(sessions, now);
    document.getElementById('today-stats').innerHTML = `
        <div class="stat-tile"><div class="stat-value">${s.days}<small>/7</small></div><div class="stat-label">jours actifs</div></div>
        <div class="stat-tile"><div class="stat-value">${s.minutes}<small> min</small></div><div class="stat-label">cette semaine</div></div>
        <div class="stat-tile"><div class="stat-value">${streak}</div><div class="stat-label">jours d'affilée</div></div>`;
}

function renderTodayShortcuts() {
    const box = document.getElementById('today-shortcuts');
    const kegels = (db.exercices || []).filter(e => e.type === 'kegel');
    const items = [];
    if (kegels.length) {
        items.push(`<button type="button" class="shortcut" onclick="startKegelExpress()"><span class="shortcut-icon">🌬️</span><span><strong>Kegel express</strong><small>${kegels.length > 1 ? `${kegels.length} exercices` : '1 exercice'} · ~${Math.max(1, Math.round(estimateWorkoutDuration(kegels) / 60))} min</small></span></button>`);
    }
    items.push(`<button type="button" class="shortcut" onclick="openQuickWorkoutSetup()"><span class="shortcut-icon">✨</span><span><strong>Séance libre</strong><small>choisir mes exercices</small></span></button>`);
    items.push(`<button type="button" class="shortcut" onclick="switchTab('plans')"><span class="shortcut-icon">📋</span><span><strong>Tous les programmes</strong><small>${(db.plans || []).length} programmes</small></span></button>`);
    box.innerHTML = items.join('');
}

function renderTodayLast(sessions) {
    const box = document.getElementById('today-last');
    const derniere = sessions.length ? sessions[sessions.length - 1] : null;
    if (!derniere) {
        box.innerHTML = '<p class="today-empty">Votre première séance apparaîtra ici, avec votre ressenti.</p>';
        return;
    }
    const quand = typeof relativeDay === 'function' ? relativeDay(derniere.date) : '';
    const duree = derniere.dureeSec ? ` · ${Math.max(1, Math.round(derniere.dureeSec / 60))} min` : '';
    const ressenti = [];
    if (derniere.douleur !== undefined && derniere.douleur !== null) ressenti.push(`douleur ${derniere.douleur}/10`);
    if (derniere.effort !== undefined && derniere.effort !== null) ressenti.push(`effort ${derniere.effort}/10`);
    box.innerHTML = `
        <div class="last-title">${todayEsc(derniere.nom || 'Séance')}</div>
        <div class="last-meta">${todayEsc(quand)}${duree}${derniere.termine === false ? ' · interrompue' : ''}</div>
        ${ressenti.length ? `<div class="last-feel">${ressenti.join(' · ')}</div>` : ''}
        ${derniere.note ? `<div class="last-note">« ${todayEsc(derniere.note)} »</div>` : ''}`;
}

/** Une séance de tous les exercices « cycles » (plancher pelvien), une série chacun. */
function startKegelExpress() {
    const kegels = (db.exercices || []).filter(e => e.type === 'kegel').map(e => {
        const c = structuredClone(e);
        c.series = 1;
        return c;
    });
    if (!kegels.length) return;
    startWorkout({ id: 'kegel_express', nom: 'Kegel express', exercices_ids: kegels.map(e => e.id) }, kegels);
}

/* ---------- Choix d'un autre programme ---------- */

function openTodayPicker() {
    triggerHaptic();
    const list = document.getElementById('today-picker-list');
    const sessions = readSessions();
    const derniers = lastDoneByPlan(sessions);
    list.innerHTML = '';
    (db.plans || []).forEach(plan => {
        const exos = todayPlanExercises(plan);
        const d = derniers[String(plan.id)];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'picker-item';
        btn.innerHTML = `
            <span class="picker-name">${todayEsc(plan.nom)}</span>
            <span class="picker-meta">${formatEstimate(estimateWorkoutDuration(exos))} · ${exos.length} exos · ${d ? 'fait ' + todayEsc(relativeDay(d.toISOString())) : 'jamais fait'}</span>`;
        btn.onclick = () => {
            todayOverridePlanId = plan.id;
            closeTodayPicker();
            renderToday();
        };
        list.appendChild(btn);
    });
    document.getElementById('modal-today-picker').classList.add('active');
}

function closeTodayPicker(event) {
    const modal = document.getElementById('modal-today-picker');
    if (event && event.target !== modal && event.target.className !== 'close-btn') return;
    modal.classList.remove('active');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TODAY_DAY_NAMES,
        planForWeekday,
        lastDoneByPlan,
        pickTodayPlan,
        sessionsOn,
        startOfWeek,
        weekStrip,
        weekSummary,
        greeting
    };
}
