# Document de Suivi - FitTrack Pro

Ce document sert à suivre l'avancement du projet FitTrack Pro, répertorier les fonctionnalités existantes et définir les prochaines étapes de développement.

## 📁 Architecture Actuelle

- `index.html` : L'interface utilisateur PWA (Vanilla JS, HTML, CSS). Inclut la logique de navigation, la recherche, l'affichage des exercices, la synchronisation avec Google Apps Script et le mode "Séance en cours".
- `sw.js` : Le Service Worker permettant le fonctionnement de l'application hors ligne et la mise en cache des ressources.
- `manifest.json` : Le fichier de configuration de la PWA (couleurs, icônes, nom).
- `icon-192.png` / `icon-512.png` : Les icônes de l'application web.

---

## ✅ Fonctionnalités Terminées & Créées

### 1. Interface Web (Frontend)
- [x] **Design Modern & PWA** : Thème sombre (Garmin-like), PWA responsive pour mobile, tablette et bureau.
- [x] **Navigation par onglets** : Mes Programmes, Bibliothèque (Exercices), Paramètres.
- [x] **Recherche en temps réel** : Filtrage des programmes et des exercices par nom, description ou tags.

### 2. Bibliothèque des Exercices & Programmes
- [x] **Affichage en grille (Cartes)** : Affichage détaillé des exercices (images, tags, répétitions) et des programmes.
- [x] **Modale de détails d'un programme** : Liste des exercices, temps de repos, raccourcis vers des minuteurs individuels.
- [x] **Modale de détails d'un exercice** : Bouton de recherche YouTube intégré, description détaillée.

### 3. Mode "Séance en cours" (Workout Sequence)
- [x] **Interface plein écran** : Suivi étape par étape d'une séance.
- [x] **Système de séries (Sets)** : Bulles visuelles indiquant les séries complétées et restantes.
- [x] **Minuteur de repos avec audio** : Minuteur dynamique entre les séries et exercices, avec bips audio de fin de repos.
- [x] **Écran de fin de séance** : Suivi du nombre d'entraînements complétés (système de badges).

### 4. Gestion des Données & Mode Hors Ligne
- [x] **Synchronisation Google Apps Script** : Téléchargement dynamique du JSON contenant les exercices et les plans.
- [x] **Stockage local (`localStorage`)** : Sauvegarde des données de l'API et de l'historique d'entraînement pour un fonctionnement 100% hors ligne.
- [x] **Service Worker (`sw.js`)** : Mise en cache des assets statiques (`index.html`, icônes, manifest, polices).

---

## 🛠️ Fonctions Existantes dans le Code (Technique)

### Dans `index.html` (JS Vanilla)
**Initialisation & Navigation**
- `init()` : Charge les données du `localStorage` au démarrage.
- `switchTab(tab)` : Gère le basculement entre les sections (Programmes, Exercices, Paramètres).

**Rendu UI**
- `renderPlans(plans)` : Génère les cartes des programmes d'entraînement.
- `renderExercices(exercices)` : Génère les cartes des exercices individuels.
- `getExImage(ex)` : Gère le fallback des images des exercices.

**Synchronisation & Données**
- `syncData()` : Appel fetch vers l'URL Google Apps Script, formattage et sauvegarde.
- `clearData()` : Suppression des données locales.
- `updateStatusUI()` : Mise à jour de l'UI indiquant l'état de la synchronisation.

**Mode Séance (Workout Engine)**
- `startWorkout(plan)` : Initialise la séquence d'entraînement en plein écran.
- `renderWorkoutStep()` : Affiche l'exercice ou le repos courant.
- `nextWorkoutStep()`, `advanceAfterRest()`, `skipRest()` : Gère l'avancement dans les séries.
- `startRestTimer(duration)` : Logique du minuteur avec setInterval.
- `showWorkoutEnd()`, `quitWorkout()`, `finishWorkout()` : Gère la fin de l'entraînement.
- `playBeep(frequency, duration)` : Génère des bips via l'AudioContext du navigateur.

**Minuteurs basiques (hors mode séance)**
- `startTimer(duration, buttonId)` : Lance un petit minuteur sur le bouton de l'exercice.
- `stopAllTimers()` : Nettoie les intervalles.

**Modales**
- `openPlanDetails(plan)`, `closeModal()` : Ouverture/Fermeture modale programme.
- `openExerciceDetails(ex)`, `closeExModal()` : Ouverture/Fermeture modale exercice.

---

## 🚧 Ce qu'il reste à faire / Idées d'améliorations (À Faire)

- [ ] **Gestion avancée de l'historique** :
  - Créer un graphique ou une vue "Statistiques" détaillant les dates d'entraînement au lieu d'un simple compteur de complétion.
- [ ] **Gestion des poids et charges** :
  - Ajouter un champ pour que l'utilisateur puisse noter les poids soulevés pendant la séance et sauvegarder son évolution.
- [ ] **Sons personnalisables** :
  - Ajouter des fichiers audio locaux ou la possibilité de désactiver complètement le son dans les "Paramètres".
- [ ] **Génération d'images d'exercices hors ligne** :
  - Remplacer l'appel API dynamique `ui-avatars.com` par une méthode générant des canvas hors ligne (pour éviter qu'une image manque sans connexion).
- [x] **Refactoring (Optionnel mais recommandé si l'app grossit)** :
  - Séparer le CSS, le HTML et le JavaScript de `index.html` dans des fichiers distincts (`style.css`, `app.js`).
