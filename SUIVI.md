# Document de Suivi - FitTrack Pro

Ce document sert à suivre l'avancement du projet FitTrack Pro, répertorier les fonctionnalités existantes et définir les prochaines étapes de développement.

## 📁 Architecture Actuelle

- `index.html` : L'interface utilisateur PWA (Vanilla JS, HTML, CSS). Inclut la logique de navigation, la recherche, l'affichage des exercices, la synchronisation avec Google Apps Script et le mode "Séance en cours".
- `sw.js` : Le Service Worker permettant le fonctionnement de l'application hors ligne et la mise en cache des ressources.
- `manifest.json` : Le fichier de configuration de la PWA (couleurs, icônes, nom).
- `icon-192.png` / `icon-512.png` : Les icônes de l'application web.

---

## ✅ Fonctionnalités Terminées & Créées

### 1. Interface Web (Frontend V2)
- [x] **Design "Samsung One UI"** : Refonte totale (Squircles, Glassmorphism, Viewing/Interaction Areas) avec fond AMOLED et accents bleus doux.
- [x] **Bottom Navigation Bar** : Navigation repensée sur mobile (icônes SVG) : Programmes, Bibliothèque, Statistiques, Paramètres.
- [x] **Bottom Sheets (Modales)** : Modales glissantes depuis le bas de l'écran pour faciliter l'usage à une main.
- [x] **Recherche en temps réel** : Champs de recherche arrondis en "pilule" avec effet flouté.

### 2. Bibliothèque des Exercices & Programmes
- [x] **Affichage en grille (Cartes)** : Affichage détaillé des exercices (images, tags, répétitions) et des programmes.
- [x] **Modale de détails d'un programme** : Liste des exercices, temps de repos, raccourcis vers des minuteurs individuels.
- [x] **Modale de détails d'un exercice** : Bouton de recherche YouTube intégré, description détaillée.

### 3. Mode "Séance en cours" (Workout Sequence)
- [x] **Interface plein écran** : Suivi étape par étape d'une séance.
- [x] **Système de séries (Sets)** : Bulles visuelles indiquant les séries complétées et restantes.
- [x] **Minuteur de repos avec audio** : Minuteur dynamique entre les séries et exercices, avec bips audio de fin de repos.
- [x] **Écran de fin de séance** : Suivi du nombre d'entraînements complétés (système de badges).

### 4. Gestion des Données, Rappels & Statistiques (V2)
- [x] **Génération de calendrier (`.ics`)** : Ajout d'un bouton "Rappel" générant un événement local de 1h pour synchronisation Agenda.
- [x] **Historique avancé (Heatmap)** : Suivi détaillé des dates (`fitness_sessions`) pour générer une carte de chaleur sur 30 jours et une liste des séances récentes.
- [x] **Stockage local (`localStorage`)** : Sauvegarde des données de l'API (`fitness_data`) et historique (`fitness_sessions`) hors-ligne.
- [x] **Nouveaux types d'exercices** : Support des charges (Poids en kg) et du cardio (Distance en km).

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

- [ ] **Suivi d'évolution par exercice** :
  - Actuellement, on modifie la charge pour "la séance en cours", mais il serait intéressant de sauvegarder la progression (historique du RM max) par exercice.
- [ ] **Sons personnalisables** :
  - Ajouter des fichiers audio locaux pour remplacer les bips générés par oscillateurs (AudioContext).
- [ ] **Génération d'images d'exercices hors ligne** :
  - Assurer qu'il y ait toujours un fallback local si l'API WGER ou UI Avatars est injoignable (déjà partiellement traité via les SVGs locaux dans `utils.js`).
