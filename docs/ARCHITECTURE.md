# Architecture du Projet

Ce document sert à référencer les décisions techniques, la stack utilisée et le flux de données. L'agent IA doit le mettre à jour lorsque l'architecture globale évolue.

## Stack Technique
- Vanilla JavaScript (ES6+)
- HTML5, CSS3 (Variables CSS, Flexbox, Grid)
- PWA (Service Worker pour l'Offline-First)

## Structure des Dossiers
- `/docs/` : Documentation interne et suivi du projet (`ARCHITECTURE.md`, `WORKLOG.md`, `FEATURES_V3.md`). Le document de référence `SUIVI.md` est à la racine.
- `/js/` : Moteur logique (`app.js`), couche de données (`store.js`), fonctionnalités de suivi (`coach.js`), utilitaires (`utils.js`), tests unitaires.
- `/css/` : Feuilles de styles.
- `/assets/` : Icônes et images statiques.
- `/tests/e2e/` : Tests de bout en bout Playwright.
- `index.html` : L'unique point d'entrée UI.

## Découpage des scripts

Les scripts sont chargés dans cet ordre, chacun s'appuyant sur le précédent :

| Fichier | Rôle |
| --- | --- |
| `js/utils.js` | Fonctions pures sans état : visuels SVG de repli (`getExImage`), échappement HTML (`escapeHtml`). |
| `js/store.js` | **Couche de données.** Seul fichier qui écrit dans le `localStorage`. Journal de performance, historique de séances, sauvegarde/restauration, séance en cours, calculs (volume, série de jours, formatage). |
| `js/app.js` | **Contrôleur.** État global (`db`, `currentWorkout`), navigation, rendu, et machine à états du mode « Séance ». |
| `js/coach.js` | **Fonctionnalités de suivi.** Se branche sur `app.js` : journalisation des séries, reprise des charges, reprise de séance, CRUD bibliothèque/programmes, sauvegarde, statistiques de progression. |

`js/coach.js` accède aux variables globales de `js/app.js` (`db`, `currentWorkout`…) : ces déclarations `let` de premier niveau sont partagées entre scripts classiques du même document, `coach.js` étant chargé après `app.js`.

## Clés de stockage (`STORE_KEYS` dans `js/store.js`)

| Clé | Contenu |
| --- | --- |
| `fitness_data` | Bibliothèque d'exercices et programmes (`{exercices, plans}`). |
| `fitness_sessions` | Historique des séances : date, durée, séries, tonnage, ressenti, détail par exercice. |
| `fitness_logs` | Journal de performance par exercice : `{ [exId]: [{date, type, cible, sets, volume}] }`. |
| `fitness_history` | Compteur historique par programme (badge des cartes), conservé pour compatibilité. |
| `fitness_active_session` | Séance en cours, pour la reprise après interruption (valable 12 h). |
| `fitness_snapshot` | Copie de secours prise avant import, synchronisation ou effacement. |
| `sync_url`, `last_sync`, `fitness_sound_pref`, `fitness_prefill_pref` | Réglages. |

Toutes les écritures passent par `writeJSON()`, qui intercepte le dépassement de quota : le journal le plus ancien est élagué puis l'écriture est retentée, plutôt que de perdre silencieusement la donnée qui vient d'être produite.

## Flux d'une séance

1. `startWorkout()` clone les exercices du programme, puis `coachPrepareExercises()` remplace les valeurs cibles par la meilleure performance réalisée la dernière fois (préférence « Reprendre mes dernières charges »).
2. Chaque validation de série appelle `coachRecordSet()`, qui mémorise la valeur réellement réalisée (compteur manuel s'il a été utilisé) et la charge du moment.
3. L'état complet est réécrit dans `fitness_active_session` à chaque étape : une interruption (verrouillage, appel, fermeture de l'onglet) ne fait plus perdre la séance.
4. `coachCommitSession()` écrit une entrée par exercice dans `fitness_logs` et une séance détaillée dans `fitness_sessions`, puis purge la séance en cours.
5. Quitter en cours de route propose d'enregistrer le travail déjà réalisé ou de garder la séance en attente.

## Sauvegarde et restauration

`buildBackup()` produit une enveloppe versionnée `{format, version, exportedAt, data, sessions, history, logs, settings}`. `parseBackup()` accepte aussi l'ancien format d'export (`{exercices, plans}`) afin de ne jamais rejeter une sauvegarde existante. `applyBackup()` applique en mode `replace` ou `merge` (`mergeDb`, `mergeLogs`, `mergeSessions` dédoublonnent par identifiant et par date).

Une copie de secours (`takeSnapshot()`) est prise automatiquement avant tout import, toute synchronisation et tout effacement ; le bouton « Annuler la dernière opération » la restaure.

## Synchronisation Google Sheets

La synchronisation propose désormais une **fusion** lorsque l'appareil contient des créations locales (identifiants préfixés `custom_`, `web_`, `plan_`). L'ancien comportement remplaçait l'intégralité de la base et effaçait donc ces créations à chaque synchronisation.

## Service Worker

`sw.js` sert le code de l'application (HTML, JS, CSS) en **network-first** avec repli sur le cache, et les ressources immuables (icônes, polices) en cache-first. La version précédente servait tout depuis le cache sans jamais le rafraîchir : une fois installée sur le téléphone, l'application ne pouvait plus recevoir de mise à jour. Le nom de cache (`fitness-tracker-v2`) doit être incrémenté à chaque changement de la liste de ressources.

### V3 Engine Refactor
- **Pattern Stratégie**: Implémenté via `WorkoutStrategies` dans `js/app.js` pour simplifier le formatage et la gestion des timers actifs.
- **Heatmap Musculaire**: Refonte de la heatmap sur les 7 derniers jours pour se concentrer sur les groupes musculaires en extrayant les tags des exercices.
