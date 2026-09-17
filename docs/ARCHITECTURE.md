# Architecture du Projet

Ce document sert à référencer les décisions techniques, la stack utilisée et le flux de données. L'agent IA doit le mettre à jour lorsque l'architecture globale évolue.

## Stack Technique
- Vanilla JavaScript (ES6+)
- HTML5, CSS3 (Variables CSS, Flexbox, Grid)
- PWA (Service Worker pour l'Offline-First)

## Structure des Dossiers
- `/docs/` : Documentation interne et suivi du projet (`ARCHITECTURE.md`, `WORKLOG.md`, `FEATURES_V3.md`). Le document de référence `SUIVI.md` est à la racine.
- `/js/` : Moteur logique (`app.js`), couche de données (`store.js`), catalogue d'exercices (`catalogue.js`), fonctionnalités de suivi (`coach.js`), découverte d'exercices (`discover.js`), utilitaires (`utils.js`), tests unitaires.
- `/css/` : Feuilles de styles.
- `/assets/` : Icônes et images statiques.
- `/tests/e2e/` : Tests de bout en bout Playwright.
- `index.html` : L'unique point d'entrée UI.

## Découpage des scripts

Les scripts sont chargés dans cet ordre, chacun s'appuyant sur le précédent :

| Fichier | Rôle |
| --- | --- |
| `js/utils.js` | Fonctions pures sans état : visuels SVG de repli (`getExImage`), échappement HTML (`escapeHtml`). |
| `js/store.js` | **Couche de données.** Journal de performance, historique de séances, sauvegarde/restauration, séance en cours, calculs (volume, série de jours, formatage). |
| `js/catalogue.js` | **Catalogue d'exercices.** Téléchargement et compactage de la base wger, recherche locale, suggestions, rapprochement de noms. Fonctions de calcul pures. |
| `js/app.js` | **Contrôleur.** État global (`db`, `currentWorkout`), navigation, rendu, et machine à états du mode « Séance ». |
| `js/coach.js` | **Fonctionnalités de suivi.** Se branche sur `app.js` : journalisation des séries, reprise des charges, reprise de séance, CRUD bibliothèque/programmes, sauvegarde, statistiques de progression. |
| `js/discover.js` | **Interface de découverte.** Téléchargement du catalogue, navigateur de recherche et de suggestions, import, complètement d'un exercice existant. |

`js/coach.js` et `js/discover.js` accèdent aux variables globales de `js/app.js` (`db`, `currentWorkout`…) : ces déclarations `let` de premier niveau sont partagées entre scripts classiques du même document, ces fichiers étant chargés après `app.js`.

## Clés de stockage (`STORE_KEYS` dans `js/store.js`)

| Clé | Contenu |
| --- | --- |
| `fitness_data` | Bibliothèque d'exercices et programmes (`{exercices, plans}`). |
| `fitness_sessions` | Historique des séances : date, durée, séries, tonnage, ressenti, détail par exercice. |
| `fitness_logs` | Journal de performance par exercice : `{ [exId]: [{date, type, cible, sets, volume}] }`. |
| `fitness_history` | Compteur historique par programme (badge des cartes), conservé pour compatibilité. |
| `fitness_active_session` | Séance en cours, pour la reprise après interruption (valable 12 h). |
| `fitness_snapshot` | Copie de secours prise avant import, synchronisation ou effacement. |
| `fitness_catalogue` | Catalogue d'exercices téléchargé (~900 fiches, ~700 Ko). Volontairement **exclu des sauvegardes** : il est re-téléchargeable, contrairement aux données de l'utilisateur. |
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

## Catalogue d'exercices (`js/catalogue.js`)

### Pourquoi un téléchargement complet
L'API wger ne propose **plus** de recherche par sous-chaîne : l'endpoint
`/api/v2/exercise/search/` utilisé jusqu'ici renvoie désormais `404`, et aucun
paramètre `search`/`term` n'est accepté par les endpoints restants (le filtre
`name=` n'admet qu'une égalité exacte, et `language=` est ignoré). La seule
recherche possible est donc locale.

On télécharge `/api/v2/exerciseinfo/` par pages de 100, on projette chaque
fiche vers une forme compacte (~1 Ko contre ~7 Ko), et on range le tout dans
`localStorage`. Mesuré sur la base réelle : **902 exercices, 582 en français,
880 avec consignes, 273 avec image, 706 Ko stockés**. La recherche est ensuite
instantanée et fonctionne hors connexion.

Le HTML des consignes est converti en texte brut (`stripHtml`) : ce contenu
vient d'une source externe et ne doit jamais être réinjecté comme du balisage.

### Rapprochement de noms : la précision avant le rappel
`findCatalogueMatch` ne valide un rapprochement automatique qu'au-delà de
**0,85** de similarité. Ce seuil vient de mesures sur la bibliothèque réelle :
un seuil permissif rapprochait « Rotation des hanches assis » d'« Abduction des
hanches assis », et « Planche avec extension de la hanche » de « Planche avec
extension du bras » — des mouvements différents. Écrire les consignes d'un autre
exercice dans un programme de rééducation est pire que ne rien proposer.

La similarité est symétrique (moyenne harmonique des mots couverts de chaque
côté), ignore les mots vides (`avec`, `des`, `pour`…) et tient compte d'une
table de synonymes français ↔ anglais (`gainage` ↔ `plank`, `pont` ↔ `bridge`…).
En dessous du seuil, `topCatalogueMatches` renvoie les fiches les plus proches
et c'est l'utilisateur qui tranche.

### Suggestions
`suggestNewExercises` note chaque fiche selon les zones que l'utilisateur
travaille réellement (déduites de ses tags via `TAG_TARGETS`), puis :
- **exclut** les exercices réclamant du matériel absent (`inferEquipment` déduit
  le matériel disponible de la bibliothèque) ;
- **amortit** le poids des tags (`sqrt`) pour qu'une zone très étiquetée
  n'écrase pas les autres ;
- **pénalise les fiches fourre-tout** : « Rowing Machine » déclare treize
  muscles et touchait donc à tout ; le score est divisé par la largeur du
  ciblage ;
- **plafonne** à trois suggestions par zone du corps.

Le catalogue wger reste une base de musculation généraliste : les suggestions
sont un point de départ, pas une prescription.

## Service Worker

`sw.js` sert le code de l'application (HTML, JS, CSS) en **network-first** avec repli sur le cache, et les ressources immuables (icônes, polices) en cache-first. La version précédente servait tout depuis le cache sans jamais le rafraîchir : une fois installée sur le téléphone, l'application ne pouvait plus recevoir de mise à jour. Le nom de cache (`fitness-tracker-v3`) doit être incrémenté à chaque changement de la liste de ressources.

### V3 Engine Refactor
- **Pattern Stratégie**: Implémenté via `WorkoutStrategies` dans `js/app.js` pour simplifier le formatage et la gestion des timers actifs.
- **Heatmap Musculaire**: Refonte de la heatmap sur les 7 derniers jours pour se concentrer sur les groupes musculaires en extrayant les tags des exercices.
