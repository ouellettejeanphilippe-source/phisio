# Comment démarrer FitTrack Pro ?

Les navigateurs web modernes (Chrome, Firefox, Safari) bloquent le chargement direct des fichiers JSON pour des raisons de sécurité (politique CORS) si vous ouvrez simplement le fichier `index.html` avec un double-clic.

Pour utiliser l'application avec vos données, vous devez la lancer à travers un serveur web local. Pas de panique, c'est très simple et automatisé !

## Prérequis
Vous devez avoir **Python** installé sur votre ordinateur.

## Pour les utilisateurs Windows
1. Double-cliquez sur le fichier `demarrer_windows.bat`.
2. Une fenêtre noire (invite de commande) va s'ouvrir. **Ne la fermez pas**.
3. Votre navigateur s'ouvrira automatiquement sur l'application (`http://localhost:8000`).

## Pour les utilisateurs Mac / Linux
1. Ouvrez votre terminal.
2. Naviguez dans le dossier du projet.
3. Lancez la commande suivante :
   `./demarrer_mac_linux.sh`
   *(Si l'autorisation est refusée, tapez d'abord `chmod +x demarrer_mac_linux.sh`)*
4. Le navigateur s'ouvrira automatiquement. **Ne fermez pas le terminal** pendant l'utilisation.

## Comment l'utiliser sur mon téléphone (PWA) ?
L'application est conçue pour être installée directement sur votre téléphone depuis un navigateur (sans passer par l'App Store ou Play Store).
1. Hébergez le projet en ligne (ex: GitHub Pages) ou connectez votre téléphone au même réseau Wi-Fi que votre ordinateur (en remplaçant `localhost` par l'IP de votre ordinateur, ex: `http://192.168.1.50:8000`).
2. Ouvrez l'URL sur votre téléphone avec Chrome ou Safari.
3. Cliquez sur "Ajouter à l'écran d'accueil" (Android) ou l'icône de partage puis "Sur l'écran d'accueil" (iOS).

---

*Note: Vous pouvez aussi générer des fichiers Markdown de vos plans en utilisant le script Python en ligne de commande : `python workout_manager.py --export 1`.*