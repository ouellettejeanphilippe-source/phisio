# Comment démarrer PhysioApp (How to start PhysioApp)

Si la page est complètement blanche, c'est probablement parce que vous avez ouvert le fichier `index.html` directement avec votre navigateur. Les applications construites avec React (et Vite) ne peuvent pas être ouvertes de cette façon. Elles ont besoin d'un "serveur local" pour fonctionner.

Voici les instructions pour démarrer l'application correctement.

### Sur Windows, Mac ou Linux :

**Étape 1 : Ouvrir un Terminal (Invite de commandes)**
1. Ouvrez le dossier où se trouve ce projet (`physioapp`).
2. Ouvrez un terminal dans ce dossier.

**Étape 2 : Installer les dépendances (la première fois seulement)**
Dans le terminal, tapez la commande suivante et appuyez sur Entrée :
```bash
npm install
```

**Étape 3 : Démarrer l'application**
Dans le terminal, tapez la commande suivante et appuyez sur Entrée :
```bash
npm run dev
```

**Étape 4 : Ouvrir le navigateur**
Le terminal va afficher une adresse locale (généralement `http://localhost:5173`). 
Ouvrez votre navigateur web (Chrome, Edge, Firefox, etc.) et allez à cette adresse. L'application PhysioApp devrait maintenant s'afficher avec toutes ses couleurs et fonctionnalités !

---

### Vous ne voulez pas utiliser le terminal ? (Pour Windows)

Si vous êtes sur Windows et que vous préférez une méthode plus simple, j'ai créé un fichier pour vous :
1. Allez dans le dossier `physioapp`.
2. Double-cliquez sur le fichier `demarrer.bat` (ou `start.bat` si je l'ai nommé ainsi).
3. Cela ouvrira une fenêtre noire (le terminal) et démarrera le serveur pour vous. Ensuite, allez simplement à l'adresse `http://localhost:5173` dans votre navigateur.
