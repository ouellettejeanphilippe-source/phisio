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

---

*Note: Vous pouvez aussi générer des fichiers Markdown de vos plans en utilisant le script Python en ligne de commande : `python workout_manager.py --export 1`.*