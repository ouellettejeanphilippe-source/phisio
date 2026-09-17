/**
 * Interface de découverte d'exercices.
 *
 * S'appuie sur js/catalogue.js pour : télécharger le catalogue, proposer des
 * exercices nouveaux adaptés à ce que l'utilisateur travaille déjà, chercher
 * par nom / zone / matériel, et compléter les informations manquantes d'un
 * exercice de la bibliothèque.
 */

/** 'suggest' (pour vous) ou 'search' (recherche et filtres). */
let discoverMode = 'suggest';
/** Fiche dont le détail est déplié dans la liste de résultats. */
let discoverExpandedId = null;
/**
 * Exercice de la bibliothèque en attente d'être complété manuellement.
 * Le rapprochement automatique reste volontairement strict : plutôt que de
 * risquer d'écrire les consignes d'un autre mouvement dans un exercice de
 * rééducation, on laisse l'utilisateur désigner lui-même la bonne fiche.
 */
let discoverEnrichTarget = null;
let catalogueDownloading = false;

/* ------------------------------------------------------------------ */
/* Téléchargement du catalogue                                         */
/* ------------------------------------------------------------------ */

function updateCatalogueStatus() {
    const statut = document.getElementById('catalogue-status');
    const btnSuppr = document.getElementById('btn-delete-catalogue');
    const btnDl = document.getElementById('btn-download-catalogue');
    if (!statut) return;

    const catalogue = readCatalogue();
    if (catalogue) {
        const date = catalogue.fetchedAt ? new Date(catalogue.fetchedAt).toLocaleDateString('fr-FR') : '';
        const enFrancais = catalogue.exercices.filter(catalogueIsFrench).length;
        statut.innerHTML = `✅ ${catalogue.exercices.length} exercices disponibles hors connexion ` +
            `(${enFrancais} en français)<br>Téléchargé le ${escapeHtml(date)}`;
        if (btnSuppr) btnSuppr.style.display = 'inline-block';
        if (btnDl) btnDl.innerHTML = '🔄 Mettre à jour';
    } else {
        statut.innerHTML = '⚠️ Catalogue non téléchargé — la recherche et les suggestions sont indisponibles.';
        if (btnSuppr) btnSuppr.style.display = 'none';
        if (btnDl) btnDl.innerHTML = '⬇️ Télécharger';
    }
}

/**
 * Télécharge le catalogue en affichant la progression.
 * @param {boolean} depuisModale true si lancé depuis la modale de découverte
 */
async function downloadCatalogueUI(depuisModale) {
    if (catalogueDownloading) return;

    if (!navigator.onLine) {
        showError("Connexion internet requise pour télécharger le catalogue.");
        return;
    }

    catalogueDownloading = true;
    triggerHaptic();

    const bloc = document.getElementById('catalogue-progress');
    const barre = document.getElementById('catalogue-progress-bar');
    const texte = document.getElementById('catalogue-progress-text');
    const texteModale = document.getElementById('discover-setup-progress');
    const btnDl = document.getElementById('btn-download-catalogue');

    if (bloc && !depuisModale) bloc.style.display = 'block';
    if (btnDl) btnDl.disabled = true;

    const avancement = (recus, total) => {
        const pct = total ? Math.round((recus / total) * 100) : 0;
        if (barre) barre.style.width = pct + '%';
        if (texte) texte.textContent = `${recus} / ${total} exercices…`;
        if (texteModale) texteModale.textContent = `⏳ ${recus} / ${total} exercices…`;
    };

    try {
        const catalogue = await downloadCatalogue(avancement);
        showSuccess(`Catalogue téléchargé : ${catalogue.exercices.length} exercices disponibles hors connexion.`);
        if (texteModale) texteModale.textContent = '';
        updateCatalogueStatus();
        updateStorageInfo();
        if (document.getElementById('modal-discover').classList.contains('active')) {
            renderDiscover();
        }
    } catch (err) {
        console.error('Téléchargement du catalogue :', err);
        showError(err && err.message ? err.message : "Téléchargement du catalogue impossible.");
        if (texteModale) texteModale.textContent = '';
    } finally {
        catalogueDownloading = false;
        if (btnDl) btnDl.disabled = false;
        if (bloc) bloc.style.display = 'none';
        if (barre) barre.style.width = '0%';
    }
}

function deleteCatalogueUI() {
    triggerHaptic();
    if (!confirm("Supprimer le catalogue téléchargé ?\n\nVos exercices et votre historique ne sont pas touchés ; seules la recherche et les suggestions deviendront indisponibles.")) return;
    if (deleteCatalogue()) {
        updateCatalogueStatus();
        updateStorageInfo();
        showSuccess("Catalogue supprimé.");
    } else {
        showError("Suppression impossible.");
    }
}

/* ------------------------------------------------------------------ */
/* Modale de découverte                                                */
/* ------------------------------------------------------------------ */

function openDiscover() {
    triggerHaptic();
    discoverExpandedId = null;
    document.getElementById('modal-discover').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderDiscover();
}

function closeDiscover(event) {
    if (event && event.target !== document.getElementById('modal-discover') && event.target.className !== 'close-btn') return;
    triggerHaptic();
    document.getElementById('modal-discover').classList.remove('active');
    document.body.style.overflow = 'auto';
}

/** Affiche, le cas échéant, l'exercice que l'on cherche à compléter. */
function renderEnrichBanner() {
    const hint = document.getElementById('discover-hint');
    if (!hint || !discoverEnrichTarget) return false;

    const ex = db.exercices.find(e => String(e.id) === String(discoverEnrichTarget));
    if (!ex) {
        discoverEnrichTarget = null;
        return false;
    }

    hint.innerHTML = `<div style="background: rgba(153,88,255,0.15); border: 1px solid rgba(153,88,255,0.45); border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="flex: 1; min-width: 160px; color: var(--text-primary);">
                Quelle fiche correspond à <strong>${escapeHtml(ex.nom)}</strong> ?
                <span style="display: block; opacity: 0.75; font-size: 0.85rem; margin-top: 2px;">Les plus proches d'abord — affinez la recherche si besoin.</span>
            </span>
            <button class="btn-timer" onclick="cancelEnrichTarget()" style="margin: 0; padding: 6px 12px; font-size: 0.8rem;">Annuler</button>
        </div>`;
    return true;
}

function cancelEnrichTarget() {
    triggerHaptic();
    discoverEnrichTarget = null;
    renderDiscoverResults();
}

function renderDiscover() {
    const pret = catalogueIsReady();
    document.getElementById('discover-setup').style.display = pret ? 'none' : 'block';
    document.getElementById('discover-main').style.display = pret ? 'flex' : 'none';
    if (!pret) return;

    remplirFiltres();
    setDiscoverMode(discoverMode);
}

/** Remplit les listes déroulantes à partir du contenu réel du catalogue. */
function remplirFiltres() {
    const entries = catalogueEntries();

    const categories = Array.from(new Set(entries.map(e => e.cat).filter(Boolean))).sort();
    const materiels = Array.from(new Set(entries.reduce((acc, e) => acc.concat(e.eq || []), []))).sort();

    const selCat = document.getElementById('discover-category');
    const selEq = document.getElementById('discover-equipment');
    if (!selCat || !selEq) return;

    // Conserver la sélection courante lors d'un re-rendu.
    const catCourante = selCat.value;
    const eqCourant = selEq.value;

    selCat.innerHTML = '<option value="">Toutes les zones</option>' +
        categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(traduireZone(c))}</option>`).join('');
    selEq.innerHTML = '<option value="">Tout le matériel</option>' +
        materiels.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(traduireMateriel(m))}</option>`).join('');

    if (catCourante) selCat.value = catCourante;
    if (eqCourant) selEq.value = eqCourant;
}

/** Les catégories wger sont en anglais : on les affiche en français. */
const ZONES_FR = {
    Abs: 'Abdominaux', Arms: 'Bras', Back: 'Dos', Calves: 'Mollets',
    Cardio: 'Cardio', Chest: 'Pectoraux', Legs: 'Jambes', Shoulders: 'Épaules'
};

const MATERIEL_FR = {
    Barbell: 'Barre', Bench: 'Banc', 'Cable machine': 'Poulie', Dumbbell: 'Haltères',
    'Gym mat': 'Tapis', 'Incline bench': 'Banc incliné', Kettlebell: 'Kettlebell',
    'Pull-up bar': 'Barre de traction', 'Resistance band': 'Élastique',
    'SZ-Bar': 'Barre EZ', 'Swiss Ball': 'Ballon', 'none (bodyweight exercise)': 'Poids du corps'
};

const MUSCLES_FR = {
    Abs: 'Abdominaux', Biceps: 'Biceps', Calves: 'Mollets', Chest: 'Pectoraux',
    Glutes: 'Fessiers', Hamstrings: 'Ischio-jambiers', Lats: 'Grands dorsaux',
    Quads: 'Quadriceps', Shoulders: 'Épaules', Triceps: 'Triceps',
    Trapezius: 'Trapèzes', Brachialis: 'Brachial', 'Serratus anterior': 'Dentelé antérieur',
    Soleus: 'Soléaire', 'Obliquus externus abdominis': 'Obliques'
};

function traduireZone(nom) { return ZONES_FR[nom] || nom; }
function traduireMateriel(nom) { return MATERIEL_FR[nom] || nom; }
function traduireMuscle(nom) { return MUSCLES_FR[nom] || nom; }

function setDiscoverMode(mode) {
    discoverMode = mode;
    const onglets = { suggest: 'discover-tab-suggest', search: 'discover-tab-search' };
    Object.keys(onglets).forEach(cle => {
        const btn = document.getElementById(onglets[cle]);
        if (!btn) return;
        const actif = cle === mode;
        btn.style.borderColor = actif ? 'var(--accent-color)' : 'var(--border-color)';
        btn.style.color = actif ? 'var(--accent-color)' : 'var(--text-primary)';
    });
    document.getElementById('discover-search-controls').style.display = (mode === 'search') ? 'block' : 'none';
    renderDiscoverResults();
}

function renderDiscoverResults() {
    const container = document.getElementById('discover-results');
    const hint = document.getElementById('discover-hint');
    if (!container) return;

    const entries = catalogueEntries();
    let resultats;

    if (discoverMode === 'suggest') {
        resultats = suggestNewExercises(entries, db.exercices, 15);
        hint.textContent = resultats.length > 0
            ? "Exercices absents de votre bibliothèque, choisis d'après les zones que vous travaillez déjà."
            : "Ajoutez quelques exercices étiquetés (Dos, Core, Épaules…) pour obtenir des suggestions.";
    } else {
        const criteres = {
            query: document.getElementById('discover-query').value,
            category: document.getElementById('discover-category').value,
            equipment: document.getElementById('discover-equipment').value
        };
        resultats = searchCatalogue(entries, criteres, 40);
        hint.textContent = `${resultats.length} résultat(s) sur ${entries.length} exercices.`;
    }

    if (renderEnrichBanner() && discoverMode === 'search') {
        const ex = db.exercices.find(e => String(e.id) === String(discoverEnrichTarget));
        const saisie = document.getElementById('discover-query').value.trim();
        // Tant que l'utilisateur n'a pas tapé sa propre recherche, on lui
        // présente les fiches les plus proches du nom de son exercice.
        if (ex && !saisie) {
            resultats = topCatalogueMatches(entries, ex.nom, 8).map(c => c.entry);
        }
    }

    container.innerHTML = '';
    if (resultats.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Aucun exercice trouvé.</p>';
        return;
    }

    const frag = document.createDocumentFragment();
    resultats.forEach(entry => frag.appendChild(carteDecouverte(entry)));
    container.appendChild(frag);
}

/** Une carte de résultat, dépliable pour afficher les consignes complètes. */
function carteDecouverte(entry) {
    const carte = document.createElement('div');
    carte.style.cssText = 'background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 16px; padding: 14px;';

    const nom = catalogueName(entry);
    const description = catalogueDescription(entry);
    const deplie = discoverExpandedId === entry.id;
    const enCompletion = discoverEnrichTarget !== null;
    const dejaPresent = db.exercices.some(e =>
        String(e.catalogueId) === String(entry.id) ||
        normalizeText(e.nom) === normalizeText(nom));

    const muscles = (entry.m || []).map(m => traduireMuscle(m));
    const materiel = (entry.eq || []).filter(e => e !== 'none (bodyweight exercise)').map(traduireMateriel);

    const badges = []
        .concat(entry.cat ? [`<span class="tag" style="background: var(--accent-dark); color: var(--accent-color);">${escapeHtml(traduireZone(entry.cat))}</span>`] : [])
        .concat(muscles.map(m => `<span class="tag" style="background: rgba(255,255,255,0.08);">${escapeHtml(m)}</span>`))
        .concat(materiel.map(m => `<span class="tag" style="background: rgba(88,166,255,0.15); color:#58a6ff;">🏋️ ${escapeHtml(m)}</span>`))
        .concat(catalogueIsFrench(entry) ? [] : ['<span class="tag" style="background: rgba(255,179,0,0.15); color:#ffb300;">EN</span>'])
        .join(' ');

    const vignette = entry.img
        ? `<img src="${escapeHtml(entry.img)}" alt="" loading="lazy" style="width: 64px; height: 64px; object-fit: cover; border-radius: 10px; flex-shrink: 0;">`
        : '';

    const extrait = description
        ? (deplie ? escapeHtml(description).replace(/\n/g, '<br>') : escapeHtml(description.slice(0, 110)) + (description.length > 110 ? '…' : ''))
        : '<em style="opacity:0.6;">Pas de consignes dans le catalogue.</em>';

    const variations = deplie ? findVariations(catalogueEntries(), entry, 5) : [];
    const blocVariations = variations.length > 0
        ? `<div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary);">
               Variantes : ${variations.map(v => escapeHtml(catalogueName(v))).join(' · ')}
           </div>`
        : '';

    carte.innerHTML = `
        <div style="display: flex; gap: 12px;">
            ${vignette}
            <div style="flex: 1; min-width: 0;">
                <div style="color: white; font-weight: 700; margin-bottom: 6px;">${escapeHtml(nom)}</div>
                <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px;">${badges}</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">${extrait}</div>
                ${blocVariations}
            </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn-timer" style="flex: 1; margin: 0; justify-content: center; padding: 9px; font-size: 0.85rem;">${deplie ? 'Réduire' : 'Détails'}</button>
            <button class="btn-action" style="flex: 1; margin-top: 0; padding: 9px; font-size: 0.85rem;" ${(dejaPresent && !enCompletion) ? 'disabled' : ''}>
                ${enCompletion ? '✓ Utiliser cette fiche' : (dejaPresent ? '✓ Déjà dans la bibliothèque' : '+ Ajouter')}
            </button>
        </div>
    `;

    const [btnDetails, btnAction] = carte.querySelectorAll('button');
    btnDetails.onclick = () => {
        discoverExpandedId = deplie ? null : entry.id;
        renderDiscoverResults();
    };
    if (enCompletion) {
        btnAction.onclick = () => applyCatalogueToExercise(entry.id);
    } else if (dejaPresent) {
        btnAction.style.opacity = '0.5';
        btnAction.style.cursor = 'default';
    } else {
        btnAction.onclick = () => importCatalogueExercise(entry.id);
    }

    return carte;
}

/** Ajoute une fiche du catalogue à la bibliothèque. */
function importCatalogueExercise(catalogueId) {
    triggerHaptic();
    const entry = catalogueEntries().find(e => String(e.id) === String(catalogueId));
    if (!entry) {
        showError("Exercice introuvable dans le catalogue.");
        return;
    }

    const exercice = catalogueToExercise(entry);
    // Un identifiant déjà pris (ré-import après suppression) casserait les liens.
    if (db.exercices.some(e => String(e.id) === String(exercice.id))) {
        exercice.id = 'wger_' + entry.id + '_' + Date.now();
    }

    db.exercices.push(exercice);
    if (!coachSaveDb()) return;

    coachRefreshLibrary();
    handleSearch();
    updateStorageInfo();
    renderDiscoverResults();
    showSuccess(`« ${exercice.nom} » ajouté à votre bibliothèque.`);
}

/* ------------------------------------------------------------------ */
/* Compléter un exercice existant                                      */
/* ------------------------------------------------------------------ */

/**
 * Applique une fiche choisie à la main à l'exercice en attente de complément.
 */
function applyCatalogueToExercise(catalogueId) {
    triggerHaptic();
    if (discoverEnrichTarget === null) return;

    const entry = catalogueEntries().find(e => String(e.id) === String(catalogueId));
    const index = db.exercices.findIndex(e => String(e.id) === String(discoverEnrichTarget));
    if (!entry || index === -1) {
        showError("Exercice introuvable.");
        discoverEnrichTarget = null;
        return;
    }

    const { exercice, champs } = enrichExercise(db.exercices[index], entry);
    db.exercices[index] = exercice;
    if (!coachSaveDb()) return;

    discoverEnrichTarget = null;
    coachRefreshLibrary();
    handleSearch();
    // Le complètement était le but de cette ouverture : on referme.
    document.getElementById('modal-discover').classList.remove('active');
    document.body.style.overflow = 'auto';
    showSuccess(champs.length > 0
        ? `Complété depuis « ${catalogueName(entry)} » : ${champs.join(', ')}.`
        : `« ${catalogueName(entry)} » associé — la fiche était déjà complète.`);
}

/**
 * Bascule vers le choix manuel. Le champ de recherche est laissé vide : les
 * résultats affichent alors les fiches les plus proches du nom de l'exercice,
 * et l'utilisateur peut affiner s'il le souhaite.
 */
function startManualEnrich(exId, requete) {
    discoverEnrichTarget = exId;
    closeExModal();
    openDiscover();
    setDiscoverMode('search');
    const champ = document.getElementById('discover-query');
    if (champ) champ.value = requete || '';
    renderDiscoverResults();
}

/**
 * Cherche dans le catalogue les informations manquantes d'un exercice de la
 * bibliothèque (consignes, muscles, matériel, image) sans jamais écraser ce
 * que l'utilisateur a saisi lui-même.
 */
function enrichExerciseFromCatalogue(exId) {
    triggerHaptic();

    if (!catalogueIsReady()) {
        if (confirm("Le catalogue n'est pas encore téléchargé.\n\nL'ouvrir pour le télécharger maintenant ?")) {
            closeExModal();
            openDiscover();
        }
        return;
    }

    const index = db.exercices.findIndex(e => String(e.id) === String(exId));
    if (index === -1) {
        showError("Exercice introuvable.");
        return;
    }

    const exercice = db.exercices[index];
    const entry = findCatalogueMatch(catalogueEntries(), exercice.nom);

    if (!entry) {
        // Rapprochement volontairement strict : mieux vaut faire choisir que
        // d'écrire les consignes d'un autre mouvement dans un exercice de
        // rééducation. On ouvre le catalogue sur les fiches les plus proches.
        const proches = topCatalogueMatches(catalogueEntries(), exercice.nom, 8);
        if (proches.length === 0) {
            showError(`Rien de proche de « ${exercice.nom} » dans le catalogue.`);
            return;
        }
        startManualEnrich(exercice.id, '');
        return;
    }

    const { exercice: enrichi, champs } = enrichExercise(exercice, entry);

    if (champs.length === 0) {
        db.exercices[index] = enrichi; // conserve au moins le lien au catalogue
        coachSaveDb();
        showSuccess(`« ${catalogueName(entry)} » trouvé — cette fiche est déjà complète.`);
        return;
    }

    if (!confirm(`Correspondance trouvée : « ${catalogueName(entry)} ».\n\n` +
        `Compléter les champs vides (${champs.join(', ')}) ?\n\n` +
        `Ce que vous avez déjà écrit ne sera pas modifié.`)) return;

    db.exercices[index] = enrichi;
    if (!coachSaveDb()) return;

    coachRefreshLibrary();
    handleSearch();
    closeExModal();
    showSuccess(`Complété depuis le catalogue : ${champs.join(', ')}.`);
}
