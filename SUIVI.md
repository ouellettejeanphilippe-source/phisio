# Document de Suivi & Architecture - FitTrack Pro

Ce document centralise la documentation technique, le suivi des fonctionnalités, l'architecture logicielle de FitTrack Pro et les propositions d'évolution pour faciliter la reprise et le développement futur.

## 📁 1. Architecture du Dépôt et des Fichiers

L'application est une **PWA (Progressive Web App)** "Offline-First" entièrement basée sur des technologies web standards (Vanilla JS, HTML, CSS), sans framework externe (comme React ou Vue). Ce choix garantit la légèreté, la facilité de maintenance et des performances élevées sur tous les appareils.

### Fichiers Principaux
- `index.html` : Squelette de l'interface utilisateur. Inclut la structure DOM pour la navigation, les vues principales (Programmes, Bibliothèque, Statistiques, Paramètres) et les modales superposées (Bottom Sheets).
- `app.js` : Moteur logique de l'application (Contrôleur). Gère l'état global (`db`, `currentWorkout`), la navigation (`switchTab`), la synchronisation API, et surtout la **machine à états du mode "Séance" (Workout Engine)**.
- `style.css` : Fichier de style global. Définit le système de variables (Dark/AMOLED theme, couleurs d'accentuation), la typographie, les grilles et les animations/transitions fluides (inspirées de One UI/iOS).
- `utils.js` : Bibliothèque de fonctions utilitaires pures (ex: `getExImage` pour les fallbacks SVG, `escapeICS` pour l'export). Isolée pour faciliter les tests unitaires.
- `sw.js` : Service Worker. Intercepte les requêtes réseau et sert les fichiers statiques depuis le cache pour garantir le fonctionnement 100% hors ligne.
- `manifest.json` & `icon-*.png` : Configuration et assets pour l'installation de la PWA sur l'écran d'accueil mobile.
- `SUIVI.md` : Ce document technique de référence.

---

## ⚙️ 2. Fonctionnement Général et Flux de Données

### 2.1 L'Approche Offline-First
1. **Démarrage (`init()`)** : L'application tente de charger les données (`db`) depuis le `localStorage` de l'appareil.
2. **Si aucunes données** : L'utilisateur est invité à se rendre dans les paramètres pour effectuer une première synchronisation.
3. **Pendant l'utilisation** : Toutes les modifications locales (ajout d'une séance rapide, complétion d'un programme, modifications temporaires de répétitions) sont écrites instantanément dans le `localStorage`.
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

### 💡 Proposition de Refonte : Pattern Stratégie (Architecture Future)
Actuellement, la logique des différents types est imbriquée dans de grands blocs `if/else` (dans `renderWorkoutStep`, `startActiveWorkoutTimer`, etc.).

**Meilleur Fonctionnement (Object Oriented / Stratégie) :**
Créer des classes ou des objets "Stratégie" par type d'exercice pour séparer les responsabilités.
Exemple conceptuel :
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
*Avantage : Ajouter un nouveau type (ex: "AMRAP", "EMOM") deviendrait trivial, sans toucher au cœur du moteur.*

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

---

## 🚧 6. À Faire (TODOs & Backlog)

**Fonctionnalités & UX**
- [ ] **File d'attente dynamique (Skip & Swap)** :
  - *En cours d'implémentation* : Permettre de "sauter" un exercice pendant la séance, de le repousser à plus tard, ou de réorganiser l'ordre via une vue "À venir".
- [ ] **Réorganisation pré-séance** : Drag & drop ou boutons haut/bas dans la modale de détails d'un programme pour changer l'ordre *avant* de lancer la séance.
- [ ] **Historique d'évolution (Progress Over Time)** : Enregistrer les poids soulevés / répétitions max par exercice dans `localStorage` et générer un graphique d'évolution spécifique sur la modale de l'exercice.
- [ ] **Audio personnalisé** : Permettre à l'utilisateur de choisir des fichiers MP3 locaux pour la fin du timer, au lieu des bips d'oscillateur (AudioContext) basiques.
- [ ] **Support Multi-Profils** : Permettre de changer d'URL de synchro facilement pour gérer les programmes de plusieurs personnes sur un même appareil.

**Technique**
- [ ] **Migration vers le Pattern Stratégie** pour la gestion des types d'exercices (voir section 3).
- [ ] **Virtualisation de Liste** : Si la bibliothèque dépasse 500+ exercices, implémenter un "Virtual Scroller" dans `renderExercices` pour n'afficher dans le DOM que les éléments visibles à l'écran, afin d'économiser la RAM mobile.
- [ ] **Tests E2E** : Développer des scripts Playwright robustes pour tester automatiquement le flux du Workout Engine (lancement, timers, fin de séance) après chaque mise à jour.