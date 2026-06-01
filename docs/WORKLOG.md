# Suivi du Projet (Worklog)

## 📌 En cours
- Planification et spécification des fonctionnalités pour la V3 (Refonte majeure).
- Préparation de la migration vers le Pattern Stratégie pour le Workout Engine.

## 📋 À faire
- [x] Implémenter l'architecture Pattern Stratégie dans `js/app.js`.
- [x] Développer la Heatmap Musculaire Dynamique.
- Mettre en place le "Web Fetching" avancé de médias (GIFs/SVGs).
- Affiner l'UI avec la "Bottom Island" et le Glassmorphism.

## ✅ Fait
- [x] Initialisation de la structure de documentation et des règles de l'agent.
- [x] Création des spécifications pour la V3 (`docs/FEATURES_V3.md`).

## 💡 Backlog / Idées
- **Plans d'entraînement intelligents** : Génération ou suggestion de programmes d'entraînement dynamiques (éventuellement assistés par IA).
- **Système de notifications (Push/Locales)** : Rappels d'entraînement, alertes d'inactivité, relance pour les séances prévues.
- **Gamification et Suivi de la régularité** : Streaks (séries de jours d'entraînement), trophées/badges.
- **Intégrations** : Explorer la synchronisation avec d'autres écosystèmes (export/import HealthKit, Google Fit - via Web APIs si applicable).

### 🗄️ Sources de Données Potentielles (Gratuites avec Médias)
- **wger REST API** (https://wger.de/en/software/api) : API open source très complète pour les exercices, muscles, et programmes (inclut images).
- **ExerciseDB** (via RapidAPI) : Base de données vaste avec des GIFs et des instructions détaillées (version gratuite souvent limitée en requêtes, à surveiller).
- **MuscleWiki** : Source intéressante pour mapper des exercices aux groupes musculaires avec visuels (souvent scrapé ou API non officielle, à utiliser avec prudence).
- **OpenFoodFacts** : (Si une composante nutrition/suppléments est envisagée à l'avenir).
