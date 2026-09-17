# Suivi du Projet (Worklog)

## 📌 En cours
- Rien en cours.

## 📋 À faire
- Affiner l'UI avec la "Bottom Island" et le Glassmorphism.
- **Multi-profils** : gérer plusieurs personnes (et donc plusieurs journaux) sur un même appareil.
- **Audio personnalisé** : remplacer les bips de l'AudioContext par des fichiers MP3 choisis par l'utilisateur.
- **Virtualisation de liste** : au-delà de 500 exercices, n'afficher dans le DOM que les éléments visibles.
- **Notifications locales** : rappels de séance et relances d'inactivité.

## ✅ Fait
- [x] Initialisation de la structure de documentation et des règles de l'agent.
- [x] Création des spécifications pour la V3 (`docs/FEATURES_V3.md`).
- [x] Implémenter l'architecture Pattern Stratégie dans `js/app.js`.
- [x] Développer la Heatmap Musculaire Dynamique.
- [x] **Journal de performance persistant** (`js/store.js`) : chaque série validée est
      enregistrée (valeur réalisée, charge, volume) et survit à la fin de la séance.
- [x] **Reprise des charges d'une séance à l'autre** : une séance démarre sur ce qui a
      réellement été réalisé la fois précédente. La surcharge intelligente n'est plus perdue.
- [x] **Reprise d'une séance interrompue** : la séance en cours est persistée en continu et
      un bandeau propose de la reprendre (jusqu'à 12 h plus tard).
- [x] **Sauvegarde & restauration complètes** : export d'une enveloppe versionnée
      (programmes + historique + journal + réglages), import avec choix fusion/remplacement,
      et copie de secours automatique avant toute opération destructrice.
- [x] **Synchronisation non destructive** : la synchronisation Google Sheets ne supprime
      plus les exercices et programmes créés sur l'appareil.
- [x] **CRUD complet** : créer, modifier et supprimer exercices et programmes depuis l'app,
      sans dépendre d'un Google Sheet.
- [x] **Ressenti de séance** : effort, douleur et note libre enregistrés en fin de séance.
- [x] **Statistiques de progression** : série de jours, volume hebdomadaire, temps total et
      graphique d'évolution par exercice.
- [x] **Mises à jour de la PWA** : le Service Worker sert désormais le code en
      « network-first ». Une version installée peut de nouveau être mise à jour.
- [x] **Catalogue d'exercices hors-ligne** (`js/catalogue.js`) : ~900 exercices wger
      téléchargés une fois (582 en français, 880 avec consignes), puis recherche locale
      instantanée et sans connexion.
- [x] **Correctif majeur** : l'endpoint `wger.de/api/v2/exercise/search/` utilisé par
      l'application a été retiré de l'API (404). La recherche web et l'import d'exercices
      ne fonctionnaient plus du tout ; ils passent désormais par le catalogue.
- [x] **Découverte d'exercices** (`js/discover.js`) : suggestions adaptées aux zones
      travaillées et au matériel disponible, recherche par nom / zone / matériel,
      variantes d'un même mouvement.
- [x] **Complètement d'un exercice** : retrouver consignes, muscles, matériel et image
      d'un exercice de la bibliothèque, sans jamais écraser ce que l'utilisateur a écrit.
      Rapprochement strict, choix manuel proposé en cas de doute.
- [x] **Tests E2E** : `tests/e2e/test_workout_engine.py` (moteur de séance),
      `tests/e2e/test_progress_tracking.py` (journal, reprise, sauvegarde, CRUD) et
      `tests/e2e/test_catalogue.py` (catalogue, découverte, import, complètement).

## 💡 Backlog / Idées
- **Plans d'entraînement intelligents** : génération ou suggestion de programmes dynamiques.
- **Gamification** : trophées et badges au-delà de la série de jours déjà en place.
- **Intégrations** : export/import HealthKit, Google Fit (via Web APIs si applicable).

### 🗄️ Sources de Données Potentielles (Gratuites avec Médias)
- **wger REST API** (https://wger.de/en/software/api) : *intégrée*. Attention, l'endpoint
  de recherche `/exercise/search/` n'existe plus et aucun filtre `search` n'est proposé :
  il faut télécharger le catalogue et chercher localement (voir `js/catalogue.js`).
- **ExerciseDB** (via RapidAPI) : Base de données vaste avec des GIFs et des instructions détaillées (version gratuite souvent limitée en requêtes, à surveiller).
- **MuscleWiki** : Source intéressante pour mapper des exercices aux groupes musculaires avec visuels (souvent scrapé ou API non officielle, à utiliser avec prudence).
- **OpenFoodFacts** : (Si une composante nutrition/suppléments est envisagée à l'avenir).
