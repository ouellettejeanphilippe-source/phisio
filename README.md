# Fitness Tracker Pro (Version 3.0)

Une application web locale ultra-moderne et réactive pour gérer vos programmes d'entraînement, avec une interface inspirée par la fluidité de **Samsung One UI**.

Elle fonctionne entièrement hors ligne, sur votre téléphone, sans compte et sans serveur.

## Fonctionnalités 🚀

### Le suivi qui compte
* **Journal de performance :** chaque série validée est enregistrée — répétitions réellement faites, charge, durée. Rien n'est perdu à la fin de la séance.
* **Progression automatique :** la séance suivante démarre sur ce que vous avez réellement réalisé la fois précédente. Le +1 kg d'aujourd'hui est votre point de départ la prochaine fois.
* **Rappel « dernière fois » :** pendant la séance, vous voyez ce que vous aviez fait sur cet exercice et quand.
* **Graphique d'évolution :** la fiche de chaque exercice affiche votre progression et vos dernières séances.
* **Ressenti :** effort, douleur et note libre en fin de séance — utile pour un suivi de rééducation.
* **Statistiques :** série de jours consécutifs, séances et séries de la semaine, volume soulevé, temps total, heatmap musculaire.

### Vous ne perdez plus votre séance ni vos données
* **Reprise de séance :** un appel, un écran verrouillé, une appli fermée ? La séance est retrouvée telle quelle au retour.
* **Sauvegarde complète :** l'export contient vos programmes, votre historique **et** votre journal de performance.
* **Import :** restaurez une sauvegarde sur un nouveau téléphone, en remplaçant ou en fusionnant avec ce qui est déjà là.
* **Filet de sécurité :** une copie de secours est prise automatiquement avant tout import, toute synchronisation et tout effacement. Un bouton « Annuler la dernière opération » la restaure.

### C'est votre bibliothèque
* **Créer, modifier, supprimer** vos exercices et vos programmes directement dans l'application — Google Sheets devient optionnel.
* **Synchronisation non destructive :** une synchronisation n'efface plus ce que vous avez créé sur l'appareil ; elle vous propose de fusionner.
* **Recherche web d'exercices** (API wger) pour enrichir votre bibliothèque.

### Le confort d'une vraie application
* **PWA & Mobile-First :** s'installe sur le téléphone comme une application native (`manifest.json` + Service Worker), et reçoit les mises à jour.
* **Design "One UI" (Mode Sombre AMOLED) :** ergonomie pensée pour l'utilisation à une main, *bottom sheets*, squircles et glassmorphism.
* **Mode "Séance en cours" & Chronomètres :** suivi pas à pas (répétitions, isométrie, cycles de respiration, poids, distance), file d'attente réorganisable, sauter ou repousser un exercice.
* **Rappels d'Entraînement :** export de vos programmes vers votre calendrier natif via un fichier `.ics`.
* **Intégration YouTube :** trouvez la vidéo d'un exercice en un clic.

## Comment installer l'application sur votre téléphone ? 📱

L'application est une **PWA (Progressive Web App)** : elle s'installe comme une application normale sans passer par le Play Store ou l'App Store, directement depuis son URL !

1. **Hébergez** ou **exposez** le dossier de ce projet pour y accéder depuis votre téléphone (via GitHub Pages, Netlify, Vercel ou un accès Wi-Fi local à votre ordinateur).
2. **Ouvrez** le site web de l'application depuis le navigateur de votre téléphone (Chrome, Safari, Firefox).
3. **Installez-la** :
   - Sur **Android** (Chrome) : Un bandeau "Ajouter à l'écran d'accueil" apparaîtra en bas de l'écran, ou allez dans le menu (les 3 points en haut à droite) et cliquez sur "Ajouter à l'écran d'accueil" ou "Installer l'application".
   - Sur **iOS / iPhone** (Safari) : Cliquez sur le bouton de Partage (le carré avec une flèche vers le haut) et sélectionnez "Sur l'écran d'accueil".
4. Une fois installée, l'application fonctionnera hors ligne (grâce au *Service Worker*) et apparaîtra dans votre liste d'applications avec son propre icône, sans barre d'adresse !

## ⚠️ Sauvegardez vos données

Vos données vivent dans la mémoire du navigateur de votre téléphone. Elles disparaissent si vous effacez les données du site, si vous désinstallez l'application ou si vous changez d'appareil.

**Prenez l'habitude d'exporter :** Paramètres → Sauvegarde & restauration → **Exporter**. Le fichier `.json` obtenu contient tout (programmes, historique, performances, réglages) et se réimporte en un clic sur n'importe quel appareil.

## Comment lier l'application à Google Sheets (Apps Script) ? 📊

C'est **optionnel** : vous pouvez créer vos exercices et vos programmes directement dans l'application. La synchronisation reste pratique si vous préférez gérer votre base dans un tableur.

1. Déployez l'application web (par exemple via GitHub Pages ou en transférant simplement `index.html` sur votre téléphone).
2. Ouvrez l'application, allez dans l'onglet **Paramètres**.
3. Collez l'URL de votre Google Apps Script (se terminant par `/exec`).
4. Cliquez sur **Synchroniser les données**.
5. Si vous avez déjà des créations locales, l'application vous propose de **fusionner** plutôt que de les remplacer.

*Note : l'application télécharge vos données et les sauvegarde sur votre téléphone (`localStorage`). Le fonctionnement est ensuite entièrement hors ligne.*

## Développement 🛠️

```bash
# Tests unitaires (couche de données, utilitaires, sécurité)
node --test js/app.test.js js/utils.test.js js/security.test.js js/store.test.js

# Tests de bout en bout (Playwright) : moteur de séance + suivi de progression
./run_e2e_tests.sh
```

La documentation technique se trouve dans [`SUIVI.md`](SUIVI.md) et [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
