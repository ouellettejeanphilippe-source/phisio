# Document de Suivi & Architecture - FitTrack Pro

Ce document centralise la documentation technique, le suivi des fonctionnalités, l'architecture logicielle de FitTrack Pro et les propositions d'évolution pour faciliter la reprise et le développement futur.

## 📁 1. Architecture du Dépôt et des Fichiers

L'application est une **PWA (Progressive Web App)** "Offline-First" entièrement basée sur des technologies web standards (Vanilla JS, HTML, CSS), sans framework externe (comme React ou Vue). Ce choix garantit la légèreté, la facilité de maintenance et des performances élevées sur tous les appareils.

### Fichiers Principaux
- `index.html` : Squelette de l'interface utilisateur. Inclut la structure DOM pour la navigation, les vues principales (Programmes, Bibliothèque, Statistiques, Paramètres) et les modales superposées (Bottom Sheets).
- `app.js` : Moteur logique de l'application (Contrôleur). Gère l'état global (`db`, `currentWorkout`), la navigation (`switchTab`), la synchronisation API, et surtout la **machine à états du mode "Séance" (Workout Engine)**.
- `catalogue.js` : **Catalogue d'exercices.** Télécharge et compacte la base publique wger (~900 fiches), puis assure la recherche locale, les suggestions et le rapprochement de noms — sans connexion.
- `discover.js` : **Interface de découverte.** Navigateur du catalogue (suggestions, recherche, variantes), import d'un exercice et complètement d'un exercice existant.
- `store.js` : **Couche de données.** Seul fichier qui écrit dans le `localStorage`. Journal de performance, historique détaillé, sauvegarde/restauration, séance en cours, et calculs purs (volume, série de jours, formatage).
- `coach.js` : **Fonctionnalités de suivi.** Se branche sur `app.js` : journalisation des séries, reprise des charges d'une séance à l'autre, reprise d'une séance interrompue, création/modification/suppression d'exercices et de programmes, sauvegarde, statistiques de progression.
- `style.css` : Fichier de style global. Définit le système de variables (Dark/AMOLED theme, couleurs d'accentuation), la typographie, les grilles et les animations/transitions fluides (inspirées de One UI/iOS).
- `utils.js` : Bibliothèque de fonctions utilitaires pures (ex: `getExImage` pour les fallbacks SVG, `escapeICS` pour l'export). Isolée pour faciliter les tests unitaires.
- `sw.js` : Service Worker. Sert le code de l'application en « network-first » (pour que les mises à jour arrivent jusqu'au téléphone) avec repli sur le cache, et les ressources immuables en cache-first, garantissant le fonctionnement 100% hors ligne.
- `manifest.json` & `icon-*.png` : Configuration et assets pour l'installation de la PWA sur l'écran d'accueil mobile.
- `SUIVI.md` : Ce document technique de référence.

---

## ⚙️ 2. Fonctionnement Général et Flux de Données

### 2.1 L'Approche Offline-First
1. **Démarrage (`init()`)** : L'application tente de charger les données (`db`) depuis le `localStorage` de l'appareil.
2. **Si aucunes données** : L'utilisateur est invité à se rendre dans les paramètres pour effectuer une première synchronisation.
3. **Pendant l'utilisation** : Toutes les modifications locales (ajout d'une séance rapide, complétion d'un programme, modifications de répétitions, séries réalisées) sont écrites instantanément dans le `localStorage`, via `writeJSON()` qui gère le dépassement de quota.
4. **Service Worker** : Met en cache `index.html`, les scripts, les styles et les icônes. Même en mode avion, l'application se lance et permet de faire une séance complète.

### 2.2 Synchronisation Google Sheets (API JSON)
L'application tire sa base de données d'un script Google Apps Script qui renvoie les données d'un Google Sheet au format JSON.

**Format attendu du JSON :**
```json
{
  "exercices": [
    {
      "id": "1",
      "n": "Pompes",              // (nom)
      "t": "Poitrine, Poids du corps", // (tags)
      "sets": 3,                  // (series)
      "val": 10,                  // (valeur: reps ou secs)
      "rest": 60,                 // (repos en secondes)
      "d": "Description...",      // (description)
      "type": "reps"              // Type: "reps", "secs", "kegel", "poids", "distance"
      // Options: "img" (image URL), "v" (video keyword), "eq" (equipement), "uni" (unilateral boolean)
    }
  ],
  "plans": [
    {
      "id": "p1",
      "nom": "Full Body A",
      "description": "Séance complète",
      "goal": 3,                  // (fréquence recommandée par semaine)
      "exercices_ids": ["1", "3", "5"] // Références aux IDs des exercices
    }
  ]
}
```
**Parsing dans `app.js` (`syncData()`) :**
Le JSON reçu est "nettoyé" et formaté. Les types manquants pour les exercices isométriques (ex: "planche") sont auto-corrigés en `secs`. Les données sont ensuite stockées dans `localStorage.getItem('fitness_data')`.

---

## 🏋️ 3. Gestion des Types d'Exercices et Moteur de Séance

Le **Workout Engine** gère l'avancement pas à pas dans un tableau d'exercices. Pour permettre l'édition à la volée ("Quick Edit"), les objets d'exercices du programme sont **clonés** (`structuredClone()`) au lancement, isolant ainsi la session de la base de données principale.

### Types Actuels et Traitement
- `reps` (Répétitions) : Type standard. Affiche un compteur manuel interactif optionnel.
- `secs` (Isométrie) : Affiche un minuteur circulaire. Le chronomètre décroît automatiquement avec des bips de fin.
- `kegel` (Phases cycliques) : Gère des cycles Contraction/Relâchement (`kegel_on`/`kegel_off`) avec changements de couleurs et de bips.
- `poids` : Comme `reps`, mais associe une charge (`poids` kg).
- `distance` : Comme `reps`, pour le cardio (`valeur` km).

### ✅ Pattern Stratégie (implémenté)
La logique propre à chaque type est encapsulée dans l'objet `WorkoutStrategies` de `js/app.js`, au lieu des grands blocs `if/else` d'origine.
Structure :
```javascript
const WorkoutStrategies = {
    reps: {
        renderUI: (ex) => { /* Retourne le DOM du compteur manuel */ },
        startAction: (ex, context) => { /* Logique d'attente de clic utilisateur */ },
        getDisplayText: (ex) => `${ex.series} x ${ex.valeur} reps`
    },
    secs: {
        renderUI: (ex) => { /* Retourne le DOM du timer circulaire SVG */ },
        startAction: (ex, context) => { /* setInterval, mise à jour SVG, bips */ },
        getDisplayText: (ex) => `${ex.series} x ${ex.valeur} secs`
    }
};

// Dans le moteur de workout :
const strat = WorkoutStrategies[currentExercise.type] || WorkoutStrategies.reps;
strat.renderUI(currentExercise);
```
*Avantage : ajouter un nouveau type (ex : "AMRAP", "EMOM") ne demande pas de toucher au cœur du moteur.*

### 📓 Journal de performance
À chaque série validée, `coachRecordSet()` (js/coach.js) mémorise ce qui a réellement été fait — le compteur manuel s'il a été utilisé, sinon la valeur affichée — avec la charge du moment. En fin de séance, `coachCommitSession()` écrit :

```javascript
// localStorage['fitness_logs'] : une entrée par exercice et par séance
{
  "<exId>": [
    {
      date: "2026-05-20T18:30:00.000Z",
      nom: "Pont fessier",
      type: "poids",
      cible: { valeur: 8, poids: 20 },     // ce qui était visé au départ
      sets: [{ valeur: 8, poids: 20 }, { valeur: 8, poids: 20 }],
      volume: 320                          // tonnage, reps, secondes ou km selon le type
    }
  ]
}
```

Au lancement de la séance suivante, `coachPrepareExercises()` remplace les valeurs cibles par `suggestTarget(derniereEntree)` (la meilleure série réalisée). C'est ce mécanisme qui fait survivre la surcharge intelligente d'une séance à l'autre ; il se désactive depuis Paramètres → « Reprendre mes dernières charges ».

Les exercices sont indexés **par identifiant** et non par position : la file d'attente peut être réorganisée en pleine séance sans fausser le journal.

---

## 🎨 4. Design System et Optimisations UI

L'application suit scrupuleusement les codes de **Samsung One UI 8.5** et **iOS** :
- **Fonds AMOLED** : `var(--bg-color) = #050505`.
- **Viewing vs Interaction** : La partie haute est souvent laissée claire (pour lire), la partie basse concentre les boutons et la navigation (à portée de pouce).
- **Glassmorphism & Squircles** : Flous d'arrière-plan (`backdrop-filter: blur(20px)`) et coins arrondis modérés (`12px` - `20px`), en évitant le style "pilule" complet.
- **Accents "Candy"** : Utilisation de gradients vibrants (`#6FB2FF` -> `#9958FF` -> `#FF6FD8`) pour les éléments actifs.

### 🚀 Optimisations Techniques (UI & DOM)
- **DocumentFragment** : Utilisé pour injecter massivement des éléments DOM (tags, listes d'exercices) en une seule passe pour éviter les reflows multiples du navigateur.
- **Set() pour les Lookups O(1)** : Les recherches fréquentes (comme `selectedQuickExercices.has(id)`) utilisent des `Set` au lieu de `Array.includes` pour des performances optimales.
- **Animations CSS** : Toutes les animations de minuteur ou de chargement utilisent des propriétés accélérées par le GPU (`transform`, `opacity`, `stroke-dashoffset`) pour garantir 60 FPS sur mobile.
- **Accessibilité (A11y)** : Migration vers des balises `<button>` natives, ajouts de `aria-label`, et navigation au clavier supportée sur les cartes d'exercices.
- **Haptique** : Micro-interactions via l'API `navigator.vibrate()` enveloppées dans `triggerHaptic()`.

---

## ✅ 5. Fonctionnalités Terminées

- [x] Design "Samsung One UI / iOS" (Dark AMOLED, Bottom Sheets).
- [x] Workout Engine : Plein écran, suivi des séries (bulles), timers de repos (SVG + bips).
- [x] Modificateurs : Quick Edit (modifier une séance à la volée), Quick Workout (créer depuis rien).
- [x] Intégration API Externe (WGER) : Recherche d'exercices sur le net pour les intégrer à une séance rapide avec téléchargement local.
- [x] Statistiques : Carte de chaleur des 30 derniers jours, graphique hebdomadaire dynamique.
- [x] Outils : Génération d'un fichier `.ics` de rappel d'entraînement.
- [x] **Journal de performance** : chaque série validée est enregistrée (valeur réalisée, charge, volume) et consultable par exercice.
- [x] **Progression réelle** : une séance démarre sur ce qui a été réalisé la fois précédente ; la surcharge intelligente n'est plus perdue à la fin de la séance.
- [x] **Reprise de séance** : la séance en cours survit à un verrouillage d'écran, un appel ou la fermeture de l'onglet.
- [x] **Sauvegarde & restauration** : export complet versionné, import fusion/remplacement, copie de secours automatique avant toute opération destructrice.
- [x] **Bibliothèque éditable** : créer, modifier et supprimer exercices et programmes sans passer par Google Sheets.
- [x] **Ressenti de séance** : effort, douleur et note libre, visibles dans l'historique.
- [x] **Mises à jour de la PWA** : Service Worker en « network-first » (une app installée peut de nouveau recevoir des correctifs).
- [x] **Catalogue hors-ligne** : ~900 exercices wger avec consignes, muscles et images, téléchargés une fois puis consultables sans connexion.
- [x] **Découverte d'exercices** : suggestions selon les zones travaillées et le matériel disponible, recherche par nom / zone / matériel, variantes.
- [x] **Complètement d'un exercice** : retrouver les consignes manquantes d'un exercice de la bibliothèque, sans écraser ce que l'utilisateur a écrit.

---

## 🔎 5bis. Catalogue et recherche d'exercices

L'API wger ne permet plus de rechercher par sous-chaîne : l'endpoint
`/api/v2/exercise/search/` renvoie `404` et les endpoints restants n'acceptent
qu'une égalité exacte sur `name`. La recherche web de l'application ne renvoyait
donc plus jamais rien.

`js/catalogue.js` télécharge désormais `/api/v2/exerciseinfo/` par pages de 100,
compacte chaque fiche (~1 Ko contre ~7 Ko) et la range dans `localStorage`
(mesuré : 902 exercices, 582 en français, 880 avec consignes, 706 Ko). Tout le
reste se fait sur l'appareil.

**Le rapprochement de noms privilégie la précision.** Un seuil permissif
associait « Rotation des hanches assis » à « Abduction des hanches assis » :
deux mouvements différents. Un rapprochement automatique n'est retenu qu'au-delà
de 0,85 de similarité ; en dessous, les fiches les plus proches sont proposées et
l'utilisateur choisit. Compléter un exercice n'écrase jamais un champ déjà rempli.

**Les suggestions tiennent compte du matériel.** `inferEquipment` déduit de la
bibliothèque ce dont dispose l'utilisateur ; les exercices réclamant autre chose
sont écartés. Les fiches « fourre-tout » (« Rowing Machine » déclare treize
muscles) sont pénalisées au profit d'exercices ciblés. Le catalogue wger reste
une base de musculation généraliste : les suggestions sont un point de départ,
pas une prescription.

---

## 🚧 6. À Faire (TODOs & Backlog)

**Fonctionnalités & UX**
- [x] **File d'attente dynamique (Skip & Swap)** : sauter un exercice, le repousser à plus tard, réorganiser l'ordre via la vue "À venir".
- [x] **Historique d'évolution (Progress Over Time)** : les valeurs réalisées par exercice sont enregistrées dans `fitness_logs` et un graphique d'évolution s'affiche sur la fiche de l'exercice.
- [ ] **Réorganisation pré-séance** : Drag & drop dans la modale de détails d'un programme (les boutons haut/bas existent déjà).
- [ ] **Audio personnalisé** : Permettre à l'utilisateur de choisir des fichiers MP3 locaux pour la fin du timer, au lieu des bips d'oscillateur (AudioContext) basiques.
- [ ] **Support Multi-Profils** : Gérer plusieurs personnes — et donc plusieurs journaux de performance — sur un même appareil.

**Technique**
- [x] **Migration vers le Pattern Stratégie** pour la gestion des types d'exercices (voir section 3).
- [ ] **Virtualisation de Liste** : Si la bibliothèque dépasse 500+ exercices, implémenter un "Virtual Scroller" dans `renderExercices` pour n'afficher dans le DOM que les éléments visibles à l'écran, afin d'économiser la RAM mobile.
- [x] **Tests E2E** : `tests/e2e/test_workout_engine.py` (moteur de séance) et `tests/e2e/test_progress_tracking.py` (journal, reprise de séance, sauvegarde, CRUD). Lancés par `./run_e2e_tests.sh`.