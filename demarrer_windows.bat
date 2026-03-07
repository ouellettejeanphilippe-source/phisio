@echo off
echo Démarrage de PhysioApp...
echo.
echo Veuillez patienter pendant l'installation des composants (si nécessaire)...
call npm install
echo.
echo Démarrage du serveur local...
echo.
echo IMPORTANT : Gardez cette fenêtre noire ouverte !
echo.
echo Une fois que le serveur est prêt, ouvrez votre navigateur Chrome, Edge ou Firefox
echo et allez à l'adresse suivante : http://localhost:5173
echo.
call npm run dev
pause
