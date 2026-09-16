/**
 * Couche "coach" de FitTrack Pro.
 *
 * Elle s'appuie sur js/store.js pour rendre l'application réellement utile au
 * quotidien :
 *  - elle retient ce qui a été réellement réalisé, série par série ;
 *  - elle propose la séance suivante à partir de la précédente (surcharge qui
 *    survit d'une séance à l'autre) ;
 *  - elle reprend une séance interrompue ;
 *  - elle permet de créer, modifier et supprimer ses propres exercices et
 *    programmes, sans dépendre d'un Google Sheet ;
 *  - elle sauvegarde et restaure l'intégralité des données.
 *
 * Ce fichier est chargé après js/app.js et complète ses fonctions.
 */

/* ------------------------------------------------------------------ */
/* Préférences                                                         */
/* ------------------------------------------------------------------ */

function coachPrefillEnabled() {
    try {
        return localStorage.getItem(STORE_KEYS.prefillPref) !== '0';
    } catch (e) {
        return true;
    }
}

function togglePrefillPref() {
    const checkbox = document.getElementById('toggle-prefill');
    try {
        localStorage.setItem(STORE_KEYS.prefillPref, checkbox.checked ? '1' : '0');
    } catch (e) {
        showError("Préférence non sauvegardée : stockage indisponible.");
    }
    updatePrefillToggleUI();
}

function updatePrefillToggleUI() {
    const actif = coachPrefillEnabled();
    const checkbox = document.getElementById('toggle-prefill');
    const slider = document.getElementById('prefill-slider');
    const knob = document.getElementById('prefill-knob');
    if (!checkbox || !slider || !knob) return;
    checkbox.checked = actif;
    slider.style.backgroundColor = actif ? 'var(--accent-color)' : 'var(--surface-hover)';
    slider.style.borderColor = actif ? 'var(--accent-color)' : 'var(--border-color)';
    knob.style.backgroundColor = actif ? '#000' : 'var(--text-secondary)';
    knob.style.transform = actif ? 'translateX(20px)' : 'translateX(0)';
}

/* ------------------------------------------------------------------ */
/* Sauvegarde de la base locale                                        */
/* ------------------------------------------------------------------ */

/** Enregistre `db` et prévient l'utilisateur si le stockage refuse l'écriture. */
function coachSaveDb() {
    const res = writeJSON(STORE_KEYS.data, db);
    if (!res.ok) {
        showError(res.error === 'quota'
            ? "Mémoire de l'appareil saturée : exportez puis allégez vos données."
            : "Sauvegarde impossible sur cet appareil.");
    }
    return res.ok;
}

function coachRefreshLibrary() {
    db.exercices.forEach(ex => {
        ex.tagsArray = (ex.tags || '').split(',').map(t => t.trim()).filter(t => t !== '');
    });
    renderPlans(db.plans);
    renderExercices(db.exercices);
}

/* ------------------------------------------------------------------ */
/* Préparation d'une séance : reprise des dernières performances       */
/* ------------------------------------------------------------------ */

/**
 * Applique à chaque exercice la meilleure performance réalisée la dernière
 * fois. C'est ce qui fait que la « surcharge intelligente » n'est plus perdue
 * à la fin de la séance.
 */
function coachPrepareExercises(exos) {
    if (!Array.isArray(exos) || !coachPrefillEnabled()) return exos;

    exos.forEach(ex => {
        const derniere = getLastPerf(ex.id);
        if (!derniere) return;
        // Le type a changé depuis : les valeurs ne sont plus comparables.
        if (derniere.type && derniere.type !== (ex.type || 'reps')) return;

        const cible = suggestTarget(derniere);
        if (!cible || cible.valeur <= 0) return;

        ex.valeur = cible.valeur;
        if (cible.poids > 0) ex.poids = cible.poids;
        ex.reprisAuto = true;
    });

    return exos;
}

/** Initialise le suivi de performance au démarrage d'une séance. */
function coachOnWorkoutStart() {
    currentWorkout.startedAt = Date.now();
    currentWorkout.perf = {};
    coachSaveActive();
}

/**
 * Clé de journalisation d'un exercice. On s'appuie sur l'identifiant et non
 * sur la position : la file d'attente peut être réorganisée en pleine séance.
 */
function coachPerfKey(ex) {
    return String(ex.id !== undefined && ex.id !== null && ex.id !== '' ? ex.id : ex.nom);
}

/** Mémorise la série qui vient d'être validée. */
function coachRecordSet(ex) {
    if (!currentWorkout || !ex) return;
    if (!currentWorkout.perf) currentWorkout.perf = {};

    const cle = coachPerfKey(ex);
    if (!currentWorkout.perf[cle]) {
        currentWorkout.perf[cle] = {
            exId: ex.id,
            nom: ex.nom,
            type: ex.type || 'reps',
            cible: { valeur: parseFloat(ex.valeur) || 0, poids: parseFloat(ex.poids) || 0 },
            sets: []
        };
    }

    // Si l'utilisateur a compté ses répétitions une par une, c'est ce compte
    // qui fait foi ; sinon on considère la cible affichée comme atteinte.
    const compteManuel = (typeof isInteractiveRepsModeActive !== 'undefined' && isInteractiveRepsModeActive)
        ? currentInteractiveRepsCount
        : 0;
    const valeur = compteManuel > 0 ? compteManuel : (parseFloat(ex.valeur) || 0);

    currentWorkout.perf[cle].sets.push({
        valeur: valeur,
        poids: parseFloat(ex.poids) || 0
    });

    coachSaveActive();
}

/** Affiche « Dernière fois : ... » au-dessus de l'exercice en cours. */
function coachRenderLastPerf(ex) {
    const container = document.getElementById('workout-last-perf');
    if (!container) return;

    const derniere = getLastPerf(ex.id);
    if (!derniere) {
        container.innerHTML = '<span style="opacity: 0.55;">Première fois sur cet exercice — cette séance servira de référence.</span>';
        return;
    }

    const resume = escapeHtml(formatPerf(derniere));
    const quand = escapeHtml(relativeDay(derniere.date));
    const repris = ex.reprisAuto ? ' <span style="color: var(--accent-color);">· repris automatiquement</span>' : '';
    container.innerHTML = `Dernière fois : <strong style="color: var(--text-primary);">${resume}</strong> · ${quand}${repris}`;
}

/* ------------------------------------------------------------------ */
/* Séance en cours : sauvegarde et reprise                             */
/* ------------------------------------------------------------------ */

function coachSaveActive() {
    if (!currentWorkout || !Array.isArray(currentWorkout.exercices) || currentWorkout.exercices.length === 0) return;
    saveActiveSession({
        planId: currentWorkout.planId,
        exercices: currentWorkout.exercices,
        currentExIndex: currentWorkout.currentExIndex,
        currentSet: currentWorkout.currentSet,
        perf: currentWorkout.perf || {},
        startedAt: currentWorkout.startedAt || Date.now()
    });
}

/** Propose de reprendre une séance interrompue (appel tué, téléphone verrouillé...). */
function coachCheckResumable() {
    const banniere = document.getElementById('resume-banner');
    if (!banniere) return;

    const active = readActiveSession();
    if (!active) {
        banniere.style.display = 'none';
        return;
    }

    const plan = db.plans.find(p => p.id === active.planId);
    const nom = plan ? plan.nom : 'Séance rapide';
    const exercice = active.exercices[active.currentExIndex];
    const etape = exercice ? `${exercice.nom} — série ${Math.min(active.currentSet + 1, exercice.series || 1)}` : '';

    document.getElementById('resume-banner-text').innerHTML =
        `<strong>${escapeHtml(nom)}</strong> — reprise à : ${escapeHtml(etape)} · ${escapeHtml(relativeDay(new Date(active.startedAt)))}`;
    banniere.style.display = 'flex';
}

function resumeWorkout() {
    triggerHaptic();
    const active = readActiveSession();
    if (!active) {
        showError("Cette séance n'est plus disponible.");
        coachCheckResumable();
        return;
    }

    currentWorkout = {
        planId: active.planId,
        exercices: active.exercices,
        currentExIndex: active.currentExIndex,
        currentSet: active.currentSet,
        isResting: false, // on ne reprend jamais au milieu d'un temps de repos
        restInterval: null,
        startedAt: active.startedAt,
        perf: active.perf || {}
    };

    document.getElementById('resume-banner').style.display = 'none';
    document.getElementById('workout-screen').style.display = 'flex';
    document.getElementById('workout-controls').style.display = 'block';
    document.getElementById('workout-ex-view').style.display = 'flex';
    document.getElementById('workout-end-view').style.display = 'none';
    document.body.style.overflow = 'hidden';
    renderWorkoutStep();
}

function discardResumableWorkout() {
    triggerHaptic();
    if (!confirm("Abandonner définitivement cette séance interrompue ?")) return;
    clearActiveSession();
    coachCheckResumable();
    showSuccess("Séance interrompue abandonnée.");
}

/* ------------------------------------------------------------------ */
/* Clôture d'une séance                                                */
/* ------------------------------------------------------------------ */

/**
 * Écrit dans le journal tout ce qui a été réalisé, puis enregistre la séance.
 * @param {boolean} termine - false si la séance a été quittée en cours de route
 * @returns {Object|null} la séance enregistrée
 */
function coachCommitSession(termine) {
    if (!currentWorkout || !currentWorkout.perf) return null;

    const realisations = Object.keys(currentWorkout.perf)
        .map(cle => currentWorkout.perf[cle])
        .filter(p => p && Array.isArray(p.sets) && p.sets.length > 0);

    if (realisations.length === 0) return null;

    const dateIso = new Date().toISOString();
    const dureeSec = Math.max(0, Math.round((Date.now() - (currentWorkout.startedAt || Date.now())) / 1000));

    let seriesTotal = 0;
    let tonnage = 0;

    const resume = realisations.map(p => {
        const volume = computeVolume(p.type, p.sets);
        seriesTotal += p.sets.length;
        if (p.type === 'poids') tonnage += volume;

        appendLog({
            date: dateIso,
            exId: String(p.exId),
            nom: p.nom,
            type: p.type,
            cible: p.cible,
            sets: normalizeSets(p.sets),
            volume: volume
        });

        return {
            exId: String(p.exId),
            nom: p.nom,
            type: p.type,
            sets: normalizeSets(p.sets),
            volume: volume
        };
    });

    const planDetails = db.plans.find(p => p.id === currentWorkout.planId);
    const session = {
        date: dateIso,
        planId: currentWorkout.planId,
        nom: planDetails ? planDetails.nom : 'Séance Rapide',
        dureeSec: dureeSec,
        seriesTotal: seriesTotal,
        tonnage: Math.round(tonnage),
        termine: termine !== false,
        exercices: resume
    };

    const res = appendSession(session);
    if (!res.ok) {
        showError("Séance non enregistrée : mémoire de l'appareil saturée.");
        return null;
    }

    clearActiveSession();
    return session;
}

/** Remplit le récapitulatif affiché en fin de séance. */
function coachRenderWorkoutSummary(session) {
    const container = document.getElementById('workout-end-summary');
    if (!container) return;

    if (!session) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Aucune série validée n\'a été enregistrée.</p>';
        return;
    }

    const lignes = session.exercices.map(e => {
        const perf = escapeHtml(formatPerf(e));
        return `<div style="display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span style="color: var(--text-primary); text-align: left;">${escapeHtml(e.nom)}</span>
                    <span style="color: var(--accent-color); white-space: nowrap;">${perf}</span>
                </div>`;
    }).join('');

    const tonnage = session.tonnage > 0
        ? `<span class="tag" style="background: rgba(88,166,255,0.15); color: #58a6ff;">${session.tonnage} kg soulevés</span>`
        : '';

    container.innerHTML = `
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 1rem;">
            <span class="tag" style="background: var(--accent-dark); color: var(--accent-color);">${escapeHtml(formatDuration(session.dureeSec))}</span>
            <span class="tag" style="background: rgba(255,255,255,0.1);">${session.seriesTotal} séries</span>
            ${tonnage}
        </div>
        <div style="max-height: 180px; overflow-y: auto; text-align: left; margin-bottom: 1rem;">${lignes}</div>
    `;
}

/** Enregistre le ressenti (effort, douleur, note) sur la dernière séance. */
function saveSessionFeedback() {
    triggerHaptic();
    const effort = document.getElementById('feedback-effort').value;
    const douleur = document.getElementById('feedback-douleur').value;
    const note = document.getElementById('feedback-note').value.trim();

    const res = updateLastSession({
        effort: effort ? parseInt(effort) : null,
        douleur: douleur ? parseInt(douleur) : null,
        note: note
    });

    if (res.ok) {
        showSuccess("Ressenti enregistré.");
        document.getElementById('feedback-saved').style.display = 'block';
    } else {
        showError("Aucune séance à annoter.");
    }
}

function updateFeedbackLabels() {
    const effort = document.getElementById('feedback-effort');
    const douleur = document.getElementById('feedback-douleur');
    if (effort) document.getElementById('feedback-effort-value').textContent = effort.value;
    if (douleur) document.getElementById('feedback-douleur-value').textContent = douleur.value;
}

/* ------------------------------------------------------------------ */
/* Sortie de séance                                                    */
/* ------------------------------------------------------------------ */

/**
 * Appelée avant de fermer l'écran de séance. Si des séries ont été validées
 * sans que la séance aille à son terme, on propose de les enregistrer plutôt
 * que de les perdre.
 */
function coachOnWorkoutQuit() {
    const finie = document.getElementById('workout-end-view').style.display !== 'none';
    if (finie) {
        clearActiveSession();
        coachCheckResumable();
        return;
    }

    const realisations = Object.keys(currentWorkout.perf || {})
        .map(cle => currentWorkout.perf[cle])
        .filter(p => p && p.sets && p.sets.length > 0);

    if (realisations.length === 0) {
        clearActiveSession();
        coachCheckResumable();
        return;
    }

    const nbSeries = realisations.reduce((acc, p) => acc + p.sets.length, 0);
    const choix = confirm(
        `Vous avez validé ${nbSeries} série(s).\n\n` +
        `OK  = enregistrer ce travail dans votre historique\n` +
        `Annuler = garder la séance en attente pour la reprendre plus tard`
    );

    if (choix) {
        const session = coachCommitSession(false);
        if (session) showSuccess("Séance partielle enregistrée.");
    } else {
        coachSaveActive();
    }

    coachCheckResumable();
    updateStorageInfo();
}

/* ------------------------------------------------------------------ */
/* Synchronisation non destructive                                     */
/* ------------------------------------------------------------------ */

/**
 * Décide de la façon d'intégrer des données synchronisées. Le mode
 * « fusion » protège les exercices et programmes créés sur l'appareil, que
 * l'ancien comportement (remplacement pur) effaçait à chaque synchronisation.
 * @returns {'merge'|'replace'|null} null pour annuler
 */
function coachChooseSyncMode() {
    const local = db.exercices.filter(e => String(e.id).startsWith('custom_') || String(e.id).startsWith('web_'));
    const plansLocaux = db.plans.filter(p => String(p.id).startsWith('plan_'));

    if (local.length === 0 && plansLocaux.length === 0) return 'replace';

    const message = `Vous avez ${local.length} exercice(s) et ${plansLocaux.length} programme(s) créés sur cet appareil.\n\n` +
        `OK  = FUSIONNER (les conserver et mettre à jour le reste)\n` +
        `Annuler = les remplacer par les données synchronisées`;

    if (confirm(message)) return 'merge';
    return confirm("Confirmer le REMPLACEMENT ?\n\nVos créations locales seront effacées (une copie de secours restera disponible).")
        ? 'replace'
        : null;
}

/** Intègre les données reçues de la synchronisation. */
function coachApplySyncedData(donnees) {
    const mode = coachChooseSyncMode();
    if (mode === null) return false;

    takeSnapshot('avant synchronisation');
    db = (mode === 'merge') ? mergeDb(db, donnees) : donnees;
    return true;
}

/* ------------------------------------------------------------------ */
/* Purge                                                               */
/* ------------------------------------------------------------------ */

/**
 * Efface les données locales après avoir pris une copie de secours, en
 * laissant le choix de conserver ou non l'historique de performance.
 */
function coachClearData() {
    triggerHaptic();
    if (!confirm("Effacer les programmes et exercices de cet appareil ?\n\nUne copie de secours sera conservée et pourra être restaurée.")) return;

    takeSnapshot('avant effacement');

    const effacerHistorique = confirm(
        "Effacer aussi votre historique de séances et vos performances ?\n\n" +
        "OK  = tout effacer\n" +
        "Annuler = garder votre progression"
    );

    try {
        localStorage.removeItem(STORE_KEYS.data);
        localStorage.removeItem(STORE_KEYS.lastSync);
        if (effacerHistorique) {
            localStorage.removeItem(STORE_KEYS.sessions);
            localStorage.removeItem(STORE_KEYS.history);
            localStorage.removeItem(STORE_KEYS.logs);
        }
        clearActiveSession();
    } catch (e) {
        showError("Effacement impossible.");
        return;
    }

    db = { exercices: [], plans: [] };
    renderPlans([]);
    renderExercices([]);
    updateStatusUI();
    updateStorageInfo();
    coachCheckResumable();
    showSuccess(effacerHistorique
        ? "Données et historique effacés. Une copie de secours reste disponible."
        : "Programmes effacés. Votre historique est conservé.");
}

/* ------------------------------------------------------------------ */
/* Sauvegarde / restauration                                           */
/* ------------------------------------------------------------------ */

function exportBackup() {
    triggerHaptic();
    try {
        const backup = buildBackup();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fittrack-sauvegarde-${dayKey(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccess("Sauvegarde complète exportée (programmes, historique et journal).");
    } catch (e) {
        console.error(e);
        showError("Export impossible.");
    }
}

function triggerImportBackup() {
    triggerHaptic();
    document.getElementById('import-file-input').click();
}

function handleImportFile(input) {
    const fichier = input.files && input.files[0];
    if (!fichier) return;

    const reader = new FileReader();
    reader.onload = () => {
        input.value = ''; // permet de ré-importer le même fichier
        const resultat = parseBackup(String(reader.result));
        if (!resultat.ok) {
            showError(resultat.error);
            return;
        }
        coachConfirmImport(resultat.payload);
    };
    reader.onerror = () => {
        input.value = '';
        showError("Lecture du fichier impossible.");
    };
    reader.readAsText(fichier);
}

function coachConfirmImport(payload) {
    const nbEx = payload.data.exercices.length;
    const nbPlans = payload.data.plans.length;
    const nbSeances = payload.sessions.length;

    const message = `Sauvegarde valide : ${nbEx} exercices, ${nbPlans} programmes, ${nbSeances} séances.\n\n` +
        `OK  = FUSIONNER (conserve ce qui est déjà sur cet appareil)\n` +
        `Annuler = choisir un autre mode`;

    let mode;
    if (confirm(message)) {
        mode = 'merge';
    } else if (confirm("Voulez-vous REMPLACER toutes les données de cet appareil par cette sauvegarde ?\n\nUne copie de secours sera conservée et pourra être restaurée.")) {
        mode = 'replace';
    } else {
        showSuccess("Import annulé.");
        return;
    }

    takeSnapshot('avant import');
    const res = applyBackup(payload, mode);
    if (!res.ok) {
        showError(res.error === 'quota'
            ? "Import impossible : mémoire de l'appareil saturée."
            : "Import impossible.");
        return;
    }

    db = res.data;
    coachRefreshLibrary();
    updateStatusUI();
    updateStorageInfo();
    coachCheckResumable();
    showSuccess(mode === 'merge' ? "Sauvegarde fusionnée." : "Sauvegarde restaurée.");
}

function restoreSnapshot() {
    triggerHaptic();
    const snap = readSnapshot();
    if (!snap) {
        showError("Aucune copie de secours disponible.");
        return;
    }

    const quand = snap.takenAt ? new Date(snap.takenAt).toLocaleString('fr-FR') : '';
    if (!confirm(`Restaurer la copie de secours${snap.label ? ' (' + snap.label + ')' : ''} du ${quand} ?\n\nL'état actuel sera remplacé.`)) return;

    const res = applyBackup(snap, 'replace');
    if (!res.ok) {
        showError("Restauration impossible.");
        return;
    }

    db = res.data;
    coachRefreshLibrary();
    updateStatusUI();
    updateStorageInfo();
    showSuccess("Copie de secours restaurée.");
}

function updateStorageInfo() {
    const el = document.getElementById('storage-info');
    if (!el) return;

    const sessions = readSessions();
    const logs = readLogs();
    const nbPerf = Object.keys(logs).reduce((acc, cle) => acc + (logs[cle] || []).length, 0);
    const snap = readSnapshot();

    el.innerHTML = `${db.exercices.length} exercices · ${db.plans.length} programmes · ${sessions.length} séances · ${nbPerf} performances · ${storageUsageKo()} Ko utilisés`;

    const btnRestore = document.getElementById('btn-restore-snapshot');
    if (btnRestore) {
        btnRestore.style.display = snap ? 'inline-block' : 'none';
        if (snap && snap.takenAt) {
            btnRestore.title = `Copie du ${new Date(snap.takenAt).toLocaleString('fr-FR')}`;
        }
    }
}

/* ------------------------------------------------------------------ */
/* Bibliothèque : créer, modifier, supprimer un exercice               */
/* ------------------------------------------------------------------ */

function openExerciseEditor(exId) {
    triggerHaptic();
    const modal = document.getElementById('modal-ex-editor');
    const ex = exId ? db.exercices.find(e => String(e.id) === String(exId)) : null;

    modal.dataset.editingId = ex ? String(ex.id) : '';
    document.getElementById('ex-editor-title').textContent = ex ? "Modifier l'exercice" : 'Nouvel exercice';

    document.getElementById('ex-editor-nom').value = ex ? (ex.nom || '') : '';
    document.getElementById('ex-editor-tags').value = ex ? (ex.tags || '') : '';
    document.getElementById('ex-editor-type').value = ex ? (ex.type || 'reps') : 'reps';
    document.getElementById('ex-editor-series').value = ex ? (ex.series || 3) : 3;
    document.getElementById('ex-editor-valeur').value = ex ? (ex.valeur || 10) : 10;
    document.getElementById('ex-editor-poids').value = ex ? (ex.poids || 0) : 0;
    document.getElementById('ex-editor-kegel-on').value = ex ? (ex.kegel_on || 5) : 5;
    document.getElementById('ex-editor-kegel-off').value = ex ? (ex.kegel_off || 5) : 5;
    document.getElementById('ex-editor-repos').value = ex ? (ex.repos !== undefined ? ex.repos : 60) : 60;
    document.getElementById('ex-editor-desc').value = ex ? (ex.description || '') : '';
    document.getElementById('ex-editor-video').value = ex ? (ex.video || '') : '';
    document.getElementById('ex-editor-image').value = ex ? (ex.image || '') : '';
    document.getElementById('ex-editor-equipement').value = ex ? (ex.equipement || '') : '';
    document.getElementById('ex-editor-frequence').value = ex ? (ex.frequence || 0) : 0;
    document.getElementById('ex-editor-unilateral').checked = ex ? !!ex.unilateral : false;

    document.getElementById('btn-delete-exercise').style.display = ex ? 'inline-block' : 'none';

    updateExEditorUI();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updateExEditorUI() {
    const type = document.getElementById('ex-editor-type').value;
    const lbl = document.getElementById('lbl-ex-editor-valeur');
    document.getElementById('ex-editor-kegel-container').style.display = (type === 'kegel') ? 'flex' : 'none';
    document.getElementById('ex-editor-poids-container').style.display = (type === 'poids') ? 'block' : 'none';

    if (type === 'secs') lbl.textContent = 'Temps de maintien (secondes)';
    else if (type === 'kegel') lbl.textContent = 'Nombre de cycles';
    else if (type === 'distance') lbl.textContent = 'Distance (km)';
    else lbl.textContent = 'Nombre de répétitions';
}

function closeExEditor(event) {
    if (event && event.target !== document.getElementById('modal-ex-editor') && event.target.className !== 'close-btn') return;
    triggerHaptic();
    document.getElementById('modal-ex-editor').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function saveExerciseEditor() {
    triggerHaptic();
    const nom = document.getElementById('ex-editor-nom').value.trim();
    if (!nom) {
        showError("Le nom de l'exercice est obligatoire.");
        document.getElementById('ex-editor-nom').focus();
        return;
    }

    const type = document.getElementById('ex-editor-type').value;
    const tags = document.getElementById('ex-editor-tags').value.trim();

    const donnees = {
        nom: nom,
        tags: tags,
        tagsArray: tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        type: type,
        series: Math.max(1, parseInt(document.getElementById('ex-editor-series').value) || 1),
        valeur: Math.max(0, parseFloat(document.getElementById('ex-editor-valeur').value) || 0),
        poids: Math.max(0, parseFloat(document.getElementById('ex-editor-poids').value) || 0),
        repos: Math.max(0, parseInt(document.getElementById('ex-editor-repos').value) || 0),
        kegel_on: Math.max(1, parseInt(document.getElementById('ex-editor-kegel-on').value) || 5),
        kegel_off: Math.max(1, parseInt(document.getElementById('ex-editor-kegel-off').value) || 5),
        description: document.getElementById('ex-editor-desc').value.trim(),
        video: document.getElementById('ex-editor-video').value.trim(),
        image: document.getElementById('ex-editor-image').value.trim(),
        equipement: document.getElementById('ex-editor-equipement').value.trim(),
        frequence: Math.max(0, parseInt(document.getElementById('ex-editor-frequence').value) || 0),
        unilateral: document.getElementById('ex-editor-unilateral').checked
    };

    const editingId = document.getElementById('modal-ex-editor').dataset.editingId;

    if (editingId) {
        const index = db.exercices.findIndex(e => String(e.id) === String(editingId));
        if (index === -1) {
            showError("Exercice introuvable.");
            return;
        }
        db.exercices[index] = Object.assign({}, db.exercices[index], donnees);
    } else {
        donnees.id = 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        db.exercices.push(donnees);
    }

    if (!coachSaveDb()) return;

    closeExEditor();
    // La fiche de détail éventuellement ouverte derrière affiche des valeurs
    // devenues obsolètes : on la referme plutôt que de laisser un écran faux.
    const fiche = document.getElementById('modal-ex');
    if (fiche.classList.contains('active')) {
        fiche.classList.remove('active');
    }
    coachRefreshLibrary();
    handleSearch();
    updateStorageInfo();
    showSuccess(editingId ? "Exercice modifié." : "Exercice créé.");
}

function deleteExerciseFromEditor() {
    const editingId = document.getElementById('modal-ex-editor').dataset.editingId;
    if (!editingId) return;
    deleteExercise(editingId, () => closeExEditor());
}

function deleteExercise(exId, onDone) {
    triggerHaptic();
    const ex = db.exercices.find(e => String(e.id) === String(exId));
    if (!ex) return;

    const plansConcernes = db.plans.filter(p => (p.exercices_ids || []).some(id => String(id) === String(exId)));
    const avertissement = plansConcernes.length > 0
        ? `\n\n⚠️ Il sera aussi retiré de ${plansConcernes.length} programme(s) : ${plansConcernes.map(p => p.nom).join(', ')}.`
        : '';

    if (!confirm(`Supprimer « ${ex.nom} » ?${avertissement}\n\nL'historique de performance est conservé.`)) return;

    db.exercices = db.exercices.filter(e => String(e.id) !== String(exId));
    db.plans.forEach(p => {
        p.exercices_ids = (p.exercices_ids || []).filter(id => String(id) !== String(exId));
    });

    if (!coachSaveDb()) return;

    coachRefreshLibrary();
    handleSearch();
    updateStorageInfo();
    showSuccess("Exercice supprimé.");
    if (typeof onDone === 'function') onDone();
}

/* ------------------------------------------------------------------ */
/* Programmes : créer, enregistrer, supprimer                          */
/* ------------------------------------------------------------------ */

function createNewPlan() {
    triggerHaptic();
    const nom = prompt("Nom du nouveau programme :", "Mon programme");
    if (!nom || !nom.trim()) return;

    const plan = {
        id: 'plan_' + Date.now(),
        nom: nom.trim(),
        description: 'Programme personnalisé.',
        goal: 3,
        exercices_ids: []
    };

    db.plans.push(plan);
    if (!coachSaveDb()) return;

    renderPlans(db.plans);
    updateStorageInfo();
    showSuccess("Programme créé — ajoutez-y vos exercices.");
    openPlanDetails(plan);
}

/**
 * Transforme la liste d'exercices en cours d'édition en identifiants
 * enregistrables : un exercice dont les modalités diffèrent de la
 * bibliothèque donne naissance à une variante.
 */
function coachMaterializeExercises(liste) {
    const ids = [];
    const bibliotheque = new Map(db.exercices.map(ex => [String(ex.id), ex]));

    liste.forEach(ex => {
        const original = bibliotheque.get(String(ex.id));
        const modifie = !original || (
            ex.series !== original.series ||
            ex.valeur !== original.valeur ||
            ex.repos !== original.repos ||
            ex.poids !== original.poids ||
            ex.kegel_on !== original.kegel_on ||
            ex.kegel_off !== original.kegel_off ||
            ex.type !== original.type
        );

        if (!modifie) {
            ids.push(ex.id);
            return;
        }

        const variante = structuredClone(ex);
        variante.id = 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        delete variante.reprisAuto;
        if (!variante.nom.includes('(Variante)')) {
            variante.nom = variante.nom + ' (Variante)';
        }
        db.exercices.push(variante);
        ids.push(variante.id);
    });

    return ids;
}

/** Enregistre les modifications dans le programme ouvert (sans le dupliquer). */
function updateCurrentPlan() {
    triggerHaptic();
    if (!currentViewedPlan) return;

    const index = db.plans.findIndex(p => p.id === currentViewedPlan.id);
    if (index === -1) {
        showError("Programme introuvable.");
        return;
    }

    db.plans[index].exercices_ids = coachMaterializeExercises(currentViewedPlanExercises);
    if (!coachSaveDb()) return;

    coachRefreshLibrary();
    updateStorageInfo();
    showSuccess("Programme mis à jour.");
}

function editPlanMeta() {
    triggerHaptic();
    if (!currentViewedPlan) return;

    const index = db.plans.findIndex(p => p.id === currentViewedPlan.id);
    if (index === -1) return;

    const nom = prompt("Nom du programme :", db.plans[index].nom);
    if (nom === null) return;
    if (!nom.trim()) {
        showError("Le nom ne peut pas être vide.");
        return;
    }

    const description = prompt("Description :", db.plans[index].description || '');
    if (description === null) return;

    const objectif = prompt("Fréquence recommandée (séances par semaine) :", String(db.plans[index].goal || 3));
    if (objectif === null) return;

    db.plans[index].nom = nom.trim();
    db.plans[index].description = description.trim();
    db.plans[index].goal = Math.max(0, parseInt(objectif) || 0);

    if (!coachSaveDb()) return;

    currentViewedPlan = db.plans[index];
    document.getElementById('modal-title').textContent = currentViewedPlan.nom;
    document.getElementById('modal-meta').innerHTML = `<span class="tag">${escapeHtml(String(currentViewedPlan.goal))}x / semaine</span>`;
    document.getElementById('modal-desc').textContent = currentViewedPlan.description;

    renderPlans(db.plans);
    showSuccess("Programme mis à jour.");
}

function deleteCurrentPlan() {
    triggerHaptic();
    if (!currentViewedPlan) return;
    if (!confirm(`Supprimer le programme « ${currentViewedPlan.nom} » ?\n\nLes exercices et l'historique sont conservés.`)) return;

    db.plans = db.plans.filter(p => p.id !== currentViewedPlan.id);
    if (!coachSaveDb()) return;

    closeModal(null);
    renderPlans(db.plans);
    updateStorageInfo();
    showSuccess("Programme supprimé.");
}

/** Ajoute les boutons de gestion dans la modale d'un programme. */
function coachRenderPlanActions(plan) {
    const container = document.getElementById('plan-actions');
    if (!container) return;

    const estPersonnel = String(plan.id).startsWith('plan_');
    container.innerHTML = `
        <button class="btn-timer" onclick="updateCurrentPlan()" style="flex: 1; margin: 0; justify-content: center; padding: 12px; font-size: 0.85rem;">💾 Enregistrer</button>
        <button class="btn-timer" onclick="editPlanMeta()" style="flex: 1; margin: 0; justify-content: center; padding: 12px; font-size: 0.85rem;">✏️ Renommer</button>
        <button class="btn-timer" onclick="deleteCurrentPlan()" style="flex: 1; margin: 0; justify-content: center; padding: 12px; font-size: 0.85rem; color: #ff5555; border-color: rgba(255,85,85,0.3);">🗑 Supprimer</button>
    `;
    container.style.display = 'flex';
    container.title = estPersonnel ? '' : 'Ce programme provient de la synchronisation : vos modifications restent locales.';
}

/* ------------------------------------------------------------------ */
/* Statistiques                                                        */
/* ------------------------------------------------------------------ */

/** Bandeau de synthèse : série en cours, volume, temps passé. */
function coachRenderStatsExtras() {
    const container = document.getElementById('stats-summary');
    if (!container) return;

    const sessions = readSessions();
    if (sessions.length === 0) {
        container.innerHTML = `<p style="color: var(--text-secondary); text-align: center;">Terminez une séance pour voir vos statistiques apparaître ici.</p>`;
        return;
    }

    const streak = computeStreak(sessions);
    const maintenant = Date.now();
    const semaine = sessions.filter(s => (maintenant - new Date(s.date).getTime()) < 7 * 86400000);
    const tempsTotal = sessions.reduce((acc, s) => acc + (parseInt(s.dureeSec) || 0), 0);
    const tonnageSemaine = semaine.reduce((acc, s) => acc + (parseInt(s.tonnage) || 0), 0);
    const seriesSemaine = semaine.reduce((acc, s) => acc + (parseInt(s.seriesTotal) || 0), 0);

    const tuile = (valeur, libelle, couleur) => `
        <div style="flex: 1; min-width: 120px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 16px; padding: 1rem; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 800; color: ${couleur}; line-height: 1.1;">${escapeHtml(valeur)}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(libelle)}</div>
        </div>`;

    container.innerHTML = `
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 2rem;">
            ${tuile(streak > 0 ? `🔥 ${streak}` : '—', streak > 1 ? 'jours d\'affilée' : 'jour d\'affilée', 'var(--accent-color)')}
            ${tuile(String(semaine.length), 'séances cette semaine', '#58a6ff')}
            ${tuile(String(seriesSemaine), 'séries cette semaine', '#3fb950')}
            ${tuile(tonnageSemaine > 0 ? `${tonnageSemaine}` : '—', 'kg soulevés (7 j)', '#FF6FD8')}
            ${tuile(formatDuration(tempsTotal), 'temps total', '#ffb300')}
        </div>
    `;
}

/** Petit graphique de progression (volume) pour un exercice. */
function coachProgressionChart(exId) {
    const points = getProgression(exId, 10);
    if (points.length < 2) {
        return `<p style="color: var(--text-secondary); font-size: 0.9rem;">
                    ${points.length === 1 ? 'Une seule séance enregistrée pour le moment.' : 'Aucune performance enregistrée pour le moment.'}
                </p>`;
    }

    const max = Math.max(...points.map(p => p.volume)) || 1;
    const barres = points.map(p => {
        const hauteur = Math.max(4, Math.round((p.volume / max) * 100));
        const jour = new Date(p.date);
        const etiquette = `${jour.getDate()}/${jour.getMonth() + 1}`;
        return `<div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;" title="${escapeHtml(p.resume)}">
                    <div style="width: 100%; max-width: 26px; height: ${hauteur}px; border-radius: 6px 6px 0 0; background: linear-gradient(180deg, #6FB2FF, #9958FF);"></div>
                    <span style="font-size: 0.65rem; color: var(--text-secondary);">${escapeHtml(etiquette)}</span>
                </div>`;
    }).join('');

    const premier = points[0].volume;
    const dernier = points[points.length - 1].volume;
    const evolution = premier > 0 ? Math.round(((dernier - premier) / premier) * 100) : 0;
    const couleur = evolution > 0 ? '#3fb950' : (evolution < 0 ? '#ff5555' : 'var(--text-secondary)');
    const signe = evolution > 0 ? '+' : '';

    return `
        <div style="display: flex; align-items: flex-end; gap: 6px; height: 120px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 16px; padding: 12px;">
            ${barres}
        </div>
        <div style="text-align: center; margin-top: 8px; font-size: 0.85rem; color: ${couleur};">
            ${signe}${evolution}% sur les ${points.length} dernières séances
        </div>`;
}

/** Ajoute progression, historique et actions dans la fiche d'un exercice. */
function coachRenderExerciseExtras(ex) {
    const container = document.getElementById('modal-ex-extras');
    if (!container) return;

    const derniere = getLastPerf(ex.id);
    const rappel = derniere
        ? `<div style="background: var(--accent-dark); color: var(--accent-color); border-radius: 12px; padding: 12px; text-align: center; margin-bottom: 1rem; font-weight: 600;">
               Dernière fois : ${escapeHtml(formatPerf(derniere))} · ${escapeHtml(relativeDay(derniere.date))}
           </div>`
        : '';

    const historique = getLogs(ex.id).slice(-5).reverse().map(e => `
        <div style="display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;">
            <span style="color: var(--text-secondary);">${escapeHtml(new Date(e.date).toLocaleDateString('fr-FR'))}</span>
            <span style="color: var(--text-primary);">${escapeHtml(formatPerf(e))}</span>
        </div>`).join('');

    container.innerHTML = `
        ${rappel}
        <h3 style="color: white; font-size: 1.1rem; margin: 1.5rem 0 0.75rem;">Progression</h3>
        ${coachProgressionChart(ex.id)}
        ${historique ? `<h3 style="color: white; font-size: 1.1rem; margin: 1.5rem 0 0.75rem;">Dernières séances</h3>${historique}` : ''}
        <div style="display: flex; gap: 10px; margin-top: 1.5rem;">
            <button class="btn-timer" onclick="openExerciseEditor('${escapeHtml(String(ex.id))}')" style="flex: 1; margin: 0; justify-content: center; padding: 12px; font-size: 0.85rem;">✏️ Modifier</button>
            <button class="btn-timer" onclick="deleteExercise('${escapeHtml(String(ex.id))}', closeExModal)" style="flex: 1; margin: 0; justify-content: center; padding: 12px; font-size: 0.85rem; color: #ff5555; border-color: rgba(255,85,85,0.3);">🗑 Supprimer</button>
        </div>
    `;
}

/** Détail enrichi d'une séance dans l'historique des statistiques. */
function coachFormatSessionDetails(session) {
    const morceaux = [];
    if (session.dureeSec) morceaux.push(formatDuration(session.dureeSec));
    if (session.seriesTotal) morceaux.push(`${session.seriesTotal} séries`);
    if (session.tonnage) morceaux.push(`${session.tonnage} kg`);
    if (session.effort) morceaux.push(`effort ${session.effort}/10`);
    if (session.douleur) morceaux.push(`douleur ${session.douleur}/10`);
    if (session.termine === false) morceaux.push('interrompue');
    return morceaux.join(' · ');
}

/* ------------------------------------------------------------------ */
/* Initialisation                                                      */
/* ------------------------------------------------------------------ */

function initCoach() {
    updatePrefillToggleUI();
    updateStorageInfo();
    coachCheckResumable();

    // Une séance quittée brutalement (fermeture de l'onglet) reste reprenable.
    window.addEventListener('beforeunload', () => {
        if (currentWorkout && Array.isArray(currentWorkout.exercices) && currentWorkout.exercices.length > 0
            && document.getElementById('workout-screen').style.display !== 'none') {
            coachSaveActive();
        }
    });
}
