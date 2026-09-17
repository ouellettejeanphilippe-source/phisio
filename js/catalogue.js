/**
 * Catalogue d'exercices hors-ligne de FitTrack Pro.
 *
 * L'ancienne intégration interrogeait `wger.de/api/v2/exercise/search/` à
 * chaque frappe. Cet endpoint a été retiré de l'API (404) : la recherche web
 * ne fonctionnait plus du tout, et les exercices importés arrivaient sans
 * consignes.
 *
 * L'API actuelle n'offre aucune recherche par sous-chaîne côté serveur. On
 * télécharge donc le catalogue une fois (~900 exercices, ~900 Ko une fois
 * compacté), on le range dans le stockage local, et toutes les recherches se
 * font ensuite sur l'appareil — instantanément et sans connexion, ce qui
 * correspond à la philosophie « offline-first » de l'application.
 *
 * Les fonctions de recherche et de classement sont pures (voir
 * js/catalogue.test.js).
 */

const CATALOGUE_KEY = 'fitness_catalogue';
const CATALOGUE_VERSION = 1;
const WGER_BASE = 'https://wger.de/api/v2';
/** Langues conservées : français d'abord, anglais en repli. */
const LANG_FR = 12;
const LANG_EN = 2;
/** Les consignes sont tronquées pour borner la taille du catalogue. */
const DESC_MAX = 1200;

/* ------------------------------------------------------------------ */
/* Nettoyage de texte                                                  */
/* ------------------------------------------------------------------ */

/**
 * Convertit le HTML renvoyé par l'API en texte brut.
 * Les consignes viennent d'une source externe : elles ne doivent jamais être
 * réinjectées comme du balisage.
 */
function stripHtml(html) {
    if (!html) return '';
    return String(html)
        .replace(/<\s*(br|\/p|\/li|\/div)\s*\/?>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n').map(l => l.trim()).join('\n')
        .trim();
}

/** Minuscules sans accents, pour une recherche tolérante. */
function normalizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

function truncate(text, max) {
    const limite = max || DESC_MAX;
    if (!text || text.length <= limite) return text || '';
    return text.slice(0, limite).replace(/\s+\S*$/, '') + '…';
}

/* ------------------------------------------------------------------ */
/* Projection compacte d'une fiche de l'API                            */
/* ------------------------------------------------------------------ */

/**
 * Réduit une fiche `exerciseinfo` à ce dont l'application a besoin.
 * La fiche brute pèse ~7 Ko ; la version compacte ~1 Ko.
 */
function projectCatalogueEntry(raw) {
    if (!raw || raw.id === undefined || raw.id === null) return null;

    const traductions = Array.isArray(raw.translations) ? raw.translations : [];
    const prendre = (langue) => {
        const t = traductions.find(x => x && x.language === langue && x.name);
        if (!t) return null;
        return { n: t.name.trim(), d: truncate(stripHtml(t.description)) };
    };

    const fr = prendre(LANG_FR);
    const en = prendre(LANG_EN);
    if (!fr && !en) return null; // sans nom exploitable, la fiche est inutile

    const nomMuscle = (m) => (m && (m.name_en || m.name)) || '';
    const images = Array.isArray(raw.images) ? raw.images : [];
    const principale = images.find(i => i && i.is_main) || images[0] || null;
    const videos = Array.isArray(raw.videos) ? raw.videos : [];

    return {
        id: raw.id,
        cat: (raw.category && raw.category.name) || '',
        m: (Array.isArray(raw.muscles) ? raw.muscles : []).map(nomMuscle).filter(Boolean),
        ms: (Array.isArray(raw.muscles_secondary) ? raw.muscles_secondary : []).map(nomMuscle).filter(Boolean),
        eq: (Array.isArray(raw.equipment) ? raw.equipment : []).map(e => (e && e.name) || '').filter(Boolean),
        img: (principale && principale.image) || '',
        vid: (videos[0] && videos[0].video) || '',
        grp: raw.variation_group || null,
        fr: fr,
        en: en
    };
}

/** Nom affiché : français si disponible, anglais sinon. */
function catalogueName(entry) {
    if (!entry) return '';
    return (entry.fr && entry.fr.n) || (entry.en && entry.en.n) || '';
}

/** Consignes affichées : français si disponible et non vide, anglais sinon. */
function catalogueDescription(entry) {
    if (!entry) return '';
    if (entry.fr && entry.fr.d) return entry.fr.d;
    if (entry.en && entry.en.d) return entry.en.d;
    return '';
}

/** Vrai si la fiche est disponible en français. */
function catalogueIsFrench(entry) {
    return !!(entry && entry.fr && entry.fr.n);
}

/** Tous les muscles et le matériel, pour la recherche et le classement. */
function catalogueTargets(entry) {
    if (!entry) return [];
    return [].concat(entry.m || [], entry.ms || [], [entry.cat || '']).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Correspondance français ↔ vocabulaire wger                          */
/* ------------------------------------------------------------------ */

/**
 * Le catalogue wger est décrit en anglais (catégories et muscles), alors que
 * la bibliothèque de l'utilisateur est étiquetée en français. Cette table
 * relie les deux pour pouvoir proposer des exercices pertinents.
 */
const TAG_TARGETS = {
    dos: ['Back', 'Lats', 'Trapezius'],
    dorsaux: ['Back', 'Lats'],
    thoracique: ['Back', 'Trapezius', 'Lats'],
    cervical: ['Back', 'Trapezius'],
    nuque: ['Back', 'Trapezius'],
    scapulaire: ['Back', 'Trapezius', 'Shoulders'],
    epaules: ['Shoulders'],
    deltoides: ['Shoulders'],
    core: ['Abs', 'Obliquus externus abdominis'],
    gainage: ['Abs', 'Obliquus externus abdominis'],
    abdominaux: ['Abs', 'Obliquus externus abdominis'],
    abdos: ['Abs'],
    obliques: ['Obliquus externus abdominis'],
    pectoraux: ['Chest'],
    poitrine: ['Chest'],
    bras: ['Arms', 'Biceps', 'Triceps'],
    biceps: ['Biceps'],
    triceps: ['Triceps'],
    jambes: ['Legs', 'Quads', 'Hamstrings'],
    cuisses: ['Quads', 'Hamstrings'],
    quadriceps: ['Quads'],
    ischios: ['Hamstrings'],
    fessiers: ['Glutes', 'Legs'],
    mollets: ['Calves'],
    'chaine posterieure': ['Hamstrings', 'Glutes', 'Back'],
    posture: ['Back', 'Trapezius', 'Abs'],
    postural: ['Back', 'Trapezius', 'Abs'],
    stabilite: ['Abs', 'Back'],
    equilibre: ['Legs', 'Abs'],
    mobilite: ['Back', 'Shoulders'],
    etirement: ['Back', 'Hamstrings', 'Shoulders'],
    renforcement: ['Back', 'Legs', 'Abs'],
    cardio: ['Cardio'],
    'sante pelvienne': ['Abs', 'Glutes'],
    pelvien: ['Abs', 'Glutes'],
    respiration: ['Abs']
};

/** Matériel : étiquette française de l'utilisateur ↔ nom wger. */
const EQUIPMENT_TARGETS = {
    ballon: 'Swiss Ball',
    'swiss ball': 'Swiss Ball',
    elastique: 'Resistance band',
    bande: 'Resistance band',
    halteres: 'Dumbbell',
    haltere: 'Dumbbell',
    barre: 'Barbell',
    kettlebell: 'Kettlebell',
    banc: 'Bench',
    tapis: 'Gym mat',
    'poids du corps': 'none (bodyweight exercise)',
    'sans materiel': 'none (bodyweight exercise)',
    traction: 'Pull-up bar',
    poulie: 'Cable machine'
};

/** Traduit une étiquette française en cibles wger (catégories et muscles). */
function targetsForTag(tag) {
    const cle = normalizeText(tag);
    if (!cle) return [];
    if (TAG_TARGETS[cle]) return TAG_TARGETS[cle];
    // Correspondance partielle : « Mobilité Thoracique » → « thoracique »
    const trouve = Object.keys(TAG_TARGETS).find(k => cle.includes(k));
    return trouve ? TAG_TARGETS[trouve] : [];
}

function equipmentForLabel(label) {
    const cle = normalizeText(label);
    if (!cle) return '';
    if (EQUIPMENT_TARGETS[cle]) return EQUIPMENT_TARGETS[cle];
    const trouve = Object.keys(EQUIPMENT_TARGETS).find(k => cle.includes(k));
    return trouve ? EQUIPMENT_TARGETS[trouve] : '';
}

/**
 * Le vocabulaire d'un cahier de kiné ne recoupe pas celui d'un catalogue de
 * musculation : « gainage ventral » et « plank » désignent le même exercice.
 * Ces équivalences permettent de rapprocher les deux.
 */
const SYNONYMS = {
    gainage: ['plank', 'planche'],
    planche: ['plank'],
    pont: ['bridge'],
    fessier: ['glute'],
    fessiers: ['glute', 'glutes'],
    pompe: ['push', 'pushup'],
    pompes: ['push', 'pushup'],
    traction: ['pull', 'pullup'],
    tractions: ['pull', 'pullup'],
    fente: ['lunge'],
    fentes: ['lunge'],
    squat: ['squat'],
    accroupissement: ['squat'],
    rotation: ['rotation', 'twist'],
    thoracique: ['thoracic'],
    cervical: ['neck'],
    epaule: ['shoulder'],
    epaules: ['shoulder'],
    dos: ['back'],
    hanche: ['hip'],
    hanches: ['hip'],
    genou: ['knee'],
    cheville: ['ankle'],
    etirement: ['stretch'],
    etirements: ['stretch'],
    elevation: ['raise'],
    elevations: ['raise'],
    ecarte: ['fly', 'pull apart'],
    ecartes: ['fly', 'pull apart'],
    oiseau: ['reverse fly'],
    developpe: ['press'],
    extension: ['extension'],
    flexion: ['curl'],
    curl: ['curl'],
    souleve: ['deadlift'],
    crunch: ['crunch'],
    abdominaux: ['crunch', 'abs'],
    releve: ['raise'],
    abduction: ['abduction'],
    adduction: ['adduction'],
    assis: ['seated'],
    debout: ['standing'],
    couche: ['lying', 'supine', 'bench'],
    genoux: ['kneeling'],
    lateral: ['side', 'lateral'],
    laterale: ['side', 'lateral'],
    ventral: ['front', 'prone'],
    dorsal: ['supine'],
    elastique: ['band'],
    ballon: ['ball', 'swiss ball'],
    haltere: ['dumbbell'],
    halteres: ['dumbbell']
};

/**
 * Étend un ensemble de mots avec leurs équivalents connus, pour rapprocher
 * un nom français d'une fiche décrite en anglais.
 */
function expandWords(mots) {
    const sortie = new Set();
    (mots || []).forEach(mot => {
        sortie.add(mot);
        (SYNONYMS[mot] || []).forEach(syn => {
            syn.split(/\s+/).forEach(partie => sortie.add(partie));
        });
    });
    return sortie;
}

/**
 * Mots trop courants pour distinguer deux exercices. « Planche avec extension
 * de la hanche » et « Planche avec extension du bras » partagent tout sauf
 * l'essentiel : sans ce filtre, ils se ressemblent à 75 %.
 */
const STOP_WORDS = new Set([
    'avec', 'sans', 'pour', 'dans', 'des', 'les', 'une', 'aux', 'sur', 'par',
    'and', 'the', 'with', 'from', 'your', 'into',
    'exercice', 'exercise', 'mouvement', 'position', 'variante', 'version'
]);

/** Mots porteurs de sens d'un nom déjà normalisé. */
function significantWords(texte) {
    return normalizeText(texte)
        .split(/[\s/,()-]+/)
        .filter(m => m.length > 2 && !STOP_WORDS.has(m));
}

/** Un mot est couvert si lui-même ou l'un de ses synonymes figure en face. */
function wordCovered(mot, ensembleEtendu) {
    return Array.from(expandWords([mot])).some(v => ensembleEtendu.has(v));
}

/**
 * Similarité symétrique entre deux listes de mots, synonymes compris.
 * On combine la part des mots couverts de chaque côté (moyenne harmonique)
 * pour qu'un nom court ne colle pas à n'importe quel nom long, ni l'inverse.
 * @returns {number} entre 0 et 1
 */
function wordSimilarity(motsA, motsB) {
    if (!motsA.length || !motsB.length) return 0;
    const etenduA = expandWords(motsA);
    const etenduB = expandWords(motsB);

    const partA = motsA.filter(m => wordCovered(m, etenduB)).length / motsA.length;
    const partB = motsB.filter(m => wordCovered(m, etenduA)).length / motsB.length;

    if (partA === 0 || partB === 0) return 0;
    return (2 * partA * partB) / (partA + partB);
}

/* ------------------------------------------------------------------ */
/* Recherche locale                                                    */
/* ------------------------------------------------------------------ */

/**
 * Recherche dans le catalogue.
 * @param {Array} entries fiches compactes
 * @param {Object} criteres {query, category, equipment, muscle}
 * @param {number} limite
 */
function searchCatalogue(entries, criteres, limite) {
    const liste = Array.isArray(entries) ? entries : [];
    const c = criteres || {};
    const requete = normalizeText(c.query);
    const mots = requete ? requete.split(/\s+/).filter(Boolean) : [];

    const resultats = [];
    for (let i = 0; i < liste.length; i++) {
        const entry = liste[i];
        if (!entry) continue;

        if (c.category && entry.cat !== c.category) continue;
        if (c.equipment && !(entry.eq || []).includes(c.equipment)) continue;
        if (c.muscle && !catalogueTargets(entry).includes(c.muscle)) continue;

        let score = 0;
        if (mots.length > 0) {
            const nomFr = normalizeText(entry.fr && entry.fr.n);
            const nomEn = normalizeText(entry.en && entry.en.n);
            const nom = nomFr + ' ' + nomEn;
            const tous = mots.every(mot => nom.includes(mot));
            if (!tous) continue;
            // Un début de nom vaut mieux qu'une occurrence au milieu.
            if (nomFr.startsWith(requete) || nomEn.startsWith(requete)) score += 10;
            else if (nomFr === requete || nomEn === requete) score += 20;
            else score += 3;
        }

        if (catalogueIsFrench(entry)) score += 2;
        if (catalogueDescription(entry)) score += 2;
        if (entry.img) score += 1;

        resultats.push({ entry: entry, score: score });
    }

    resultats.sort((a, b) => (b.score - a.score) ||
        catalogueName(a.entry).localeCompare(catalogueName(b.entry)));

    return resultats.slice(0, limite || 30).map(r => r.entry);
}

/* ------------------------------------------------------------------ */
/* Suggestions personnalisées                                          */
/* ------------------------------------------------------------------ */

/**
 * Déduit des tags et du matériel de la bibliothèque ce que l'utilisateur
 * travaille réellement, pour pondérer les suggestions.
 */
function buildProfile(exercices) {
    const profil = { targets: {}, equipment: {} };
    (Array.isArray(exercices) ? exercices : []).forEach(ex => {
        if (!ex) return;
        const tags = ex.tagsArray || String(ex.tags || '').split(',');
        tags.forEach(tag => {
            targetsForTag(tag).forEach(cible => {
                profil.targets[cible] = (profil.targets[cible] || 0) + 1;
            });
        });
        const materiel = equipmentForLabel(ex.equipement);
        if (materiel) profil.equipment[materiel] = (profil.equipment[materiel] || 0) + 1;
    });
    return profil;
}

/** Toujours accessible, quel que soit l'équipement de l'utilisateur. */
const EQUIPEMENT_UNIVERSEL = ['none (bodyweight exercise)', 'Gym mat'];

/**
 * Déduit le matériel dont dispose l'utilisateur à partir de sa bibliothèque.
 * Sans cela, l'application proposait « Épaulé-développé avec deux kettlebells »
 * à quelqu'un qui travaille au sol avec un ballon et un élastique.
 */
function inferEquipment(exercices) {
    const dispo = new Set(EQUIPEMENT_UNIVERSEL);
    (Array.isArray(exercices) ? exercices : []).forEach(ex => {
        if (!ex) return;
        const trouve = equipmentForLabel(ex.equipement);
        if (trouve) dispo.add(trouve);
        // Le matériel est souvent mentionné dans les tags ou le nom.
        const texte = `${ex.tags || ''} ${ex.nom || ''}`;
        Object.keys(EQUIPMENT_TARGETS).forEach(cle => {
            if (normalizeText(texte).includes(cle)) dispo.add(EQUIPMENT_TARGETS[cle]);
        });
    });
    return dispo;
}

/** Note une fiche du catalogue au regard de ce que l'utilisateur travaille. */
function scoreEntry(entry, profil, materielDispo) {
    if (!entry || !profil) return 0;

    // Un exercice qui réclame du matériel absent n'est pas réalisable.
    if (materielDispo) {
        const requis = (entry.eq || []).filter(e => !EQUIPEMENT_UNIVERSEL.includes(e));
        if (requis.some(e => !materielDispo.has(e))) return 0;
    }

    let score = 0;

    // Un tag très présent dans la bibliothèque compte davantage, mais pas
    // proportionnellement : sans cet amortissement, la zone la plus étiquetée
    // écrase toutes les autres.
    const poids = (cible) => (profil.targets[cible] ? Math.sqrt(profil.targets[cible]) : 0);

    (entry.m || []).forEach(m => { score += poids(m) * 3; });
    (entry.ms || []).forEach(m => { score += poids(m); });
    if (entry.cat) score += poids(entry.cat) * 2;
    (entry.eq || []).forEach(e => { if (profil.equipment[e]) score += Math.sqrt(profil.equipment[e]) * 2; });

    if (score === 0) return 0; // hors des zones travaillées : on ne propose pas

    // Une fiche qui déclare treize muscles (« Rowing Machine ») touche
    // forcément à tout ce que l'utilisateur travaille, sans être pour autant
    // plus pertinente. On privilégie les exercices ciblés.
    const largeur = (entry.m || []).length + (entry.ms || []).length;
    if (largeur > 3) score = score / Math.sqrt(largeur - 2);

    if (catalogueIsFrench(entry)) score += 4;
    if (catalogueDescription(entry)) score += 3;
    if (entry.img) score += 2;
    return score;
}

/** Nombre maximal de suggestions issues d'une même zone du corps. */
const CATEGORY_CAP = 3;

/** Noms déjà présents dans la bibliothèque, normalisés. */
function knownNames(exercices) {
    const noms = new Set();
    (Array.isArray(exercices) ? exercices : []).forEach(ex => {
        if (!ex) return;
        const nom = normalizeText(ex.nom).replace(/\s*\(variante\)\s*$/, '');
        if (nom) noms.add(nom);
    });
    return noms;
}

/**
 * Propose des exercices **nouveaux** : pertinents pour ce que l'utilisateur
 * travaille déjà, mais absents de sa bibliothèque. Le résultat est diversifié
 * par catégorie pour ne pas renvoyer dix variantes d'abdominaux.
 */
function suggestNewExercises(entries, exercices, limite) {
    const profil = buildProfile(exercices);
    const materiel = inferEquipment(exercices);
    const connus = knownNames(exercices);
    const idsConnus = new Set((Array.isArray(exercices) ? exercices : [])
        .map(ex => ex && ex.catalogueId).filter(v => v !== undefined && v !== null).map(String));

    const notes = [];
    (Array.isArray(entries) ? entries : []).forEach(entry => {
        if (!entry) return;
        if (idsConnus.has(String(entry.id))) return;
        if (connus.has(normalizeText(catalogueName(entry)))) return;
        const score = scoreEntry(entry, profil, materiel);
        if (score > 0) notes.push({ entry: entry, score: score });
    });

    notes.sort((a, b) => b.score - a.score);

    // Écarter le tout-venant : sous la moitié du meilleur score, la fiche
    // n'a qu'un rapport lointain avec ce que l'utilisateur travaille.
    if (notes.length > 0) {
        const seuil = notes[0].score * 0.5;
        for (let i = notes.length - 1; i >= 0 && notes[i].score < seuil; i--) notes.pop();
    }

    // Diversification : on suit l'ordre de pertinence, en plafonnant le
    // nombre de fiches par zone. Un tour de rôle strict entre catégories
    // ferait remonter une fiche faible d'une zone peu travaillée avant une
    // fiche bien plus pertinente.
    const max = limite || 12;
    const parCategorie = {};
    const resultat = [];

    for (let i = 0; i < notes.length && resultat.length < max; i++) {
        const cle = notes[i].entry.cat || 'autre';
        parCategorie[cle] = parCategorie[cle] || 0;
        if (parCategorie[cle] >= CATEGORY_CAP) continue;
        parCategorie[cle]++;
        resultat.push(notes[i].entry);
    }

    return resultat;
}

/** Variantes du même mouvement (même `variation_group` chez wger). */
function findVariations(entries, entry, limite) {
    if (!entry || !entry.grp) return [];
    return (Array.isArray(entries) ? entries : [])
        .filter(e => e && e.grp === entry.grp && e.id !== entry.id)
        .slice(0, limite || 6);
}

/* ------------------------------------------------------------------ */
/* Rapprochement avec un exercice existant                             */
/* ------------------------------------------------------------------ */

/** Similarité d'un nom cible avec une fiche du catalogue (0 à 1). */
function matchScore(entry, motsCibles, cible) {
    let meilleur = 0;
    [entry.fr && entry.fr.n, entry.en && entry.en.n].forEach(nomEntry => {
        if (!nomEntry) return;
        const candidat = normalizeText(nomEntry);
        // Pas de bonus d'inclusion : « Planche » est contenu dans « Planche
        // avec extension de la hanche » sans désigner le même exercice. Seule
        // la proportion de mots porteurs communs, dans les deux sens, compte.
        const score = (candidat === cible)
            ? 1
            : wordSimilarity(motsCibles, significantWords(nomEntry));
        if (score > meilleur) meilleur = score;
    });
    return meilleur;
}

/**
 * Candidats du catalogue pour un exercice de la bibliothèque, du plus
 * probable au moins probable.
 * @returns {Array<{entry: Object, score: number}>}
 */
function topCatalogueMatches(entries, nom, limite) {
    const cible = normalizeText(nom).replace(/\s*\(variante\)\s*$/, '');
    const motsCibles = significantWords(cible);
    if (motsCibles.length === 0) return [];

    const notes = [];
    (Array.isArray(entries) ? entries : []).forEach(entry => {
        if (!entry) return;
        const score = matchScore(entry, motsCibles, cible);
        if (score > 0.3) notes.push({ entry: entry, score: score });
    });

    notes.sort((a, b) => b.score - a.score);
    return notes.slice(0, limite || 5);
}

/**
 * Correspondance retenue automatiquement.
 *
 * Le seuil est volontairement haut. Sur la bibliothèque réelle de
 * l'utilisateur, un seuil permissif rapprochait « Rotation des hanches assis »
 * d'« Abduction des hanches assis » : deux mouvements différents. Écrire les
 * consignes d'un autre exercice dans un programme de rééducation est pire que
 * ne rien proposer — les cas écartés passent par le choix manuel.
 */
function findCatalogueMatch(entries, nom) {
    const candidats = topCatalogueMatches(entries, nom, 1);
    if (candidats.length === 0) return null;
    return candidats[0].score >= 0.85 ? candidats[0].entry : null;
}

/**
 * Complète un exercice avec les informations du catalogue, **sans écraser**
 * ce que l'utilisateur a déjà saisi.
 * @returns {{exercice: Object, champs: string[]}} champs réellement complétés
 */
function enrichExercise(exercice, entry) {
    const resultat = Object.assign({}, exercice);
    const champs = [];
    if (!entry) return { exercice: resultat, champs: champs };

    const description = catalogueDescription(entry);
    if (description && !String(resultat.description || '').trim()) {
        resultat.description = description;
        champs.push('consignes');
    }

    if (entry.img && !String(resultat.image || '').trim()) {
        resultat.image = entry.img;
        champs.push('image');
    }

    const materiel = (entry.eq || []).filter(e => e !== 'none (bodyweight exercise)');
    if (materiel.length > 0 && !String(resultat.equipement || '').trim()) {
        resultat.equipement = materiel.join(', ');
        champs.push('équipement');
    }

    const muscles = (entry.m || []);
    if (muscles.length > 0) {
        const existants = String(resultat.tags || '').split(',').map(t => t.trim()).filter(Boolean);
        const connus = new Set(existants.map(normalizeText));
        const ajouts = muscles.filter(m => !connus.has(normalizeText(m)));
        if (ajouts.length > 0) {
            resultat.tags = existants.concat(ajouts).join(', ');
            resultat.tagsArray = existants.concat(ajouts);
            champs.push('muscles');
        }
    }

    if (!resultat.video && entry.vid) {
        resultat.videoUrl = entry.vid;
        champs.push('vidéo');
    }

    resultat.catalogueId = entry.id;
    return { exercice: resultat, champs: champs };
}

/** Construit un exercice de la bibliothèque à partir d'une fiche du catalogue. */
function catalogueToExercise(entry) {
    if (!entry) return null;
    const muscles = (entry.m || []).concat(entry.cat ? [entry.cat] : []);
    const tags = Array.from(new Set(muscles)).join(', ');
    const materiel = (entry.eq || []).filter(e => e !== 'none (bodyweight exercise)');

    return {
        id: 'wger_' + entry.id,
        catalogueId: entry.id,
        nom: catalogueName(entry),
        tags: tags,
        tagsArray: tags.split(',').map(t => t.trim()).filter(Boolean),
        type: 'reps',
        series: 3,
        valeur: 10,
        poids: 0,
        repos: 60,
        kegel_on: 5,
        kegel_off: 5,
        description: catalogueDescription(entry),
        video: catalogueName(entry),
        videoUrl: entry.vid || '',
        image: entry.img || '',
        equipement: materiel.join(', '),
        frequence: 0,
        unilateral: false
    };
}

/* ------------------------------------------------------------------ */
/* Stockage et téléchargement                                          */
/* ------------------------------------------------------------------ */

function readCatalogue() {
    const brut = readJSON(CATALOGUE_KEY, null);
    if (!brut || !Array.isArray(brut.exercices)) return null;
    if (brut.version !== CATALOGUE_VERSION) return null;
    return brut;
}

function catalogueEntries() {
    const cat = readCatalogue();
    return cat ? cat.exercices : [];
}

function catalogueIsReady() {
    return catalogueEntries().length > 0;
}

/**
 * Télécharge le catalogue complet depuis wger, page par page.
 * @param {function} onProgress rappel (recus, total)
 */
async function downloadCatalogue(onProgress) {
    const taille = 100;
    const fiches = [];
    let offset = 0;
    let total = null;

    do {
        const reponse = await fetch(`${WGER_BASE}/exerciseinfo/?limit=${taille}&offset=${offset}&format=json`);
        if (!reponse.ok) throw new Error(`Réponse ${reponse.status} de wger.de`);
        const page = await reponse.json();

        if (total === null) total = page.count || 0;
        (page.results || []).forEach(raw => {
            const fiche = projectCatalogueEntry(raw);
            if (fiche) fiches.push(fiche);
        });

        offset += taille;
        if (typeof onProgress === 'function') onProgress(Math.min(offset, total), total);
    } while (offset < total);

    const catalogue = {
        version: CATALOGUE_VERSION,
        fetchedAt: new Date().toISOString(),
        source: 'wger.de (CC-BY-SA)',
        exercices: fiches
    };

    // Écriture directe et non via writeJSON() : en cas de quota, celui-ci
    // élaguerait le journal de performance. Or le catalogue est toujours
    // re-téléchargeable, alors que l'historique de l'utilisateur ne l'est pas.
    try {
        localStorage.setItem(CATALOGUE_KEY, JSON.stringify(catalogue));
    } catch (e) {
        throw new Error("Mémoire de l'appareil insuffisante pour le catalogue. Vos données d'entraînement sont intactes.");
    }

    return catalogue;
}

function deleteCatalogue() {
    try {
        localStorage.removeItem(CATALOGUE_KEY);
        return true;
    } catch (e) {
        console.warn('Suppression du catalogue impossible.', e);
        return false;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CATALOGUE_KEY,
        CATALOGUE_VERSION,
        stripHtml,
        normalizeText,
        truncate,
        projectCatalogueEntry,
        catalogueName,
        catalogueDescription,
        catalogueIsFrench,
        catalogueTargets,
        targetsForTag,
        equipmentForLabel,
        expandWords,
        wordSimilarity,
        searchCatalogue,
        buildProfile,
        scoreEntry,
        suggestNewExercises,
        findVariations,
        findCatalogueMatch,
        topCatalogueMatches,
        significantWords,
        inferEquipment,
        enrichExercise,
        catalogueToExercise
    };
}
