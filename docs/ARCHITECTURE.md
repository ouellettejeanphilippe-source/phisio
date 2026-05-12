# Architecture du Projet

Ce document sert à référencer les décisions techniques, la stack utilisée et le flux de données. L'agent IA doit le mettre à jour lorsque l'architecture globale évolue.

## Stack Technique
- Vanilla JavaScript (ES6+)
- HTML5, CSS3 (Variables CSS, Flexbox, Grid)
- PWA (Service Worker pour l'Offline-First)

## Structure des Dossiers
- `/docs/` : Documentation interne et suivi du projet (`SUIVI.md`, `ARCHITECTURE.md`, `WORKLOG.md`, `FEATURES_V3.md`).
- `/js/` : Moteur logique (`app.js`), utilitaires (`utils.js`), tests unitaires.
- `/css/` : Feuilles de styles.
- `/assets/` : Icônes et images statiques.
- `index.html` : L'unique point d'entrée UI.

## Prochaines Évolutions Architecture (V3)
1. **Moteur de Séance (Workout Engine) -> Pattern Stratégie :**
   Le grand bloc `if/else` gérant les types d'exercices dans `app.js` va être refactorisé en un objet de stratégies (`WorkoutStrategies`) pour encapsuler le comportement spécifique à chaque type (reps, secs, kegel, poids, etc.) et faciliter l'extension.
2. **Synchronisation Offline-First :**
   Maintien du modèle PWA Offline-First mais avec une abstraction plus propre pour gérer l'historique et les statistiques complexes qui seront ajoutés.

### V3 Engine Refactor
- **Pattern Stratégie**: Implémenté via `WorkoutStrategies` dans `js/app.js` pour simplifier le formatage et la gestion des timers actifs.
- **Heatmap Musculaire**: Refonte de la heatmap sur les 7 derniers jours pour se concentrer sur les groupes musculaires en extrayant les tags des exercices.