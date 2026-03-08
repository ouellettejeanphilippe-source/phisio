# Fitness Tracker Pro

Une application web locale moderne et réactive pour gérer vos programmes d'entraînement.

## Fonctionnalités 🚀
* **PWA & Mobile-First :** Interface "sharp" qui s'installe sur téléphone comme une vraie application native (grâce au fichier `manifest.json` et au Service Worker `sw.js`).
* **Mode Sombre (Dark Mode) :** Design élégant, inspiré des meilleures applications de fitness.
* **Chronomètre de Repos Intégré :** Un chronomètre est disponible directement dans vos programmes.
* **Intégration YouTube :** Trouvez les vidéos de vos exercices en un clic.
* **Synchronisation Google Sheets :** Synchronisez facilement vos données d'exercices depuis le Cloud !

## Comment installer l'application sur votre téléphone ? 📱

L'application est une **PWA (Progressive Web App)** : elle s'installe comme une application normale sans passer par le Play Store ou l'App Store, directement depuis son URL !

1. **Hébergez** ou **exposez** le dossier de ce projet pour y accéder depuis votre téléphone (via GitHub Pages, Netlify, Vercel ou un accès Wi-Fi local à votre ordinateur).
2. **Ouvrez** le site web de l'application depuis le navigateur de votre téléphone (Chrome, Safari, Firefox).
3. **Installez-la** :
   - Sur **Android** (Chrome) : Un bandeau "Ajouter à l'écran d'accueil" apparaîtra en bas de l'écran, ou allez dans le menu (les 3 points en haut à droite) et cliquez sur "Ajouter à l'écran d'accueil" ou "Installer l'application".
   - Sur **iOS / iPhone** (Safari) : Cliquez sur le bouton de Partage (le carré avec une flèche vers le haut) et sélectionnez "Sur l'écran d'accueil".
4. Une fois installée, l'application fonctionnera hors ligne (grâce au *Service Worker*) et apparaîtra dans votre liste d'applications avec son propre icône, sans barre d'adresse !

## Démarrage Rapide (En local sur ordinateur)

Double-cliquez sur l'un des scripts suivants selon votre système d'exploitation. Cela démarrera un serveur local très léger qui permet à l'application web de lire vos données correctement :
* Windows : `demarrer_windows.bat`
* Mac / Linux : `demarrer_mac_linux.sh`

L'application s'ouvrira automatiquement dans votre navigateur.

## Comment lier un Google Sheets ? 📊

Au lieu de modifier le fichier `exercices.csv` manuellement, vous pouvez tout gérer dans un tableau Google Sheets !

1. Allez sur votre Google Sheets d'exercices.
2. Cliquez sur `Fichier > Partager > Publier sur le web`.
3. Sous "Lien", choisissez votre feuille d'exercices et sélectionnez le format "Valeurs séparées par des virgules (.csv)".
4. Copiez le lien généré (qui ressemble à `https://docs.google.com/spreadsheets/d/.../pub?output=csv`).
5. Ouvrez un terminal dans le dossier du projet et exécutez la commande suivante en collant votre lien :

```bash
python sync_sheets.py "VOTRE_LIEN_GOOGLE_SHEETS_CSV"
```

Cette commande mettra automatiquement à jour `exercices.csv` et générera le nouveau `exercices.json`. Rechargez ensuite la page web !

## Gestion en Ligne de Commande (CLI)
Un outil puissant est aussi fourni (`workout_manager.py`) pour exporter vos programmes en Markdown ou chercher des exercices :
```bash
python workout_manager.py --search "Dos"
python workout_manager.py --export-all
```