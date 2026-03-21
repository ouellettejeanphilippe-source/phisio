# Fitness Tracker Pro (Version 2.0)

Une application web locale ultra-moderne et réactive pour gérer vos programmes d'entraînement, avec une interface inspirée par la fluidité de **Samsung One UI**.

## Fonctionnalités 🚀
* **PWA & Mobile-First :** Interface qui s'installe sur téléphone comme une vraie application native (grâce au fichier `manifest.json` et au Service Worker `sw.js`).
* **Design "One UI" (Mode Sombre AMOLED) :** Ergonomie pensée pour l'utilisation à une main avec une *Viewing Area* en haut, des *Bottom Sheets* (tiroirs glissants), des "Squircles" (coins extrêmement arrondis), et du glassmorphism (effets de verre dépoli).
* **Mode "Séance en cours" & Chronomètres :** Suivez vos entraînements étape par étape (répétitions, isométrie, cycles de respiration, **poids/charges**, et **distance**).
* **Statistiques Avancées :** Suivez votre régularité avec un calendrier *Heatmap* de 30 jours et l'historique détaillé de vos séances récentes.
* **Rappels d'Entraînement :** Exportez vos programmes en un clic vers votre calendrier natif (Google Agenda, Samsung Calendar) via un fichier `.ics`.
* **Intégration YouTube :** Trouvez les vidéos de vos exercices en un clic.
* **Synchronisation Google Sheets :** Synchronisez facilement vos données d'exercices depuis le Cloud pour un fonctionnement 100% hors-ligne !

## Comment installer l'application sur votre téléphone ? 📱

L'application est une **PWA (Progressive Web App)** : elle s'installe comme une application normale sans passer par le Play Store ou l'App Store, directement depuis son URL !

1. **Hébergez** ou **exposez** le dossier de ce projet pour y accéder depuis votre téléphone (via GitHub Pages, Netlify, Vercel ou un accès Wi-Fi local à votre ordinateur).
2. **Ouvrez** le site web de l'application depuis le navigateur de votre téléphone (Chrome, Safari, Firefox).
3. **Installez-la** :
   - Sur **Android** (Chrome) : Un bandeau "Ajouter à l'écran d'accueil" apparaîtra en bas de l'écran, ou allez dans le menu (les 3 points en haut à droite) et cliquez sur "Ajouter à l'écran d'accueil" ou "Installer l'application".
   - Sur **iOS / iPhone** (Safari) : Cliquez sur le bouton de Partage (le carré avec une flèche vers le haut) et sélectionnez "Sur l'écran d'accueil".
4. Une fois installée, l'application fonctionnera hors ligne (grâce au *Service Worker*) et apparaîtra dans votre liste d'applications avec son propre icône, sans barre d'adresse !

## Comment lier l'application à Google Sheets (Apps Script) ? 📊

L'application peut fonctionner de manière **100% autonome sur votre téléphone**, sans aucun serveur local ni script Python ! Pour ce faire, elle utilise un lien Google Apps Script pour récupérer vos données.

1. Déployez l'application web (par exemple via GitHub Pages ou en transférant simplement `index.html` sur votre téléphone).
2. Ouvrez l'application, allez dans l'onglet **Paramètres**.
3. Collez l'URL de votre Google Apps Script (se terminant par `/exec`).
4. Cliquez sur **Synchroniser les données**.
5. Les données sont maintenant sauvegardées dans la mémoire de votre téléphone (`localStorage`) ! Vous pouvez ouvrir l'application hors-ligne quand vous le souhaitez.

*Note : L'application télécharge vos données et les sauvegarde sur votre téléphone via localStorage. Le fonctionnement est donc entièrement hors ligne par la suite.*