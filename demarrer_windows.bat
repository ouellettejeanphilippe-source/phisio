@echo off
echo Lancement du serveur local FitTrack Pro...
echo Ne fermez pas cette fenetre noire pendant que vous utilisez l'application.
start http://localhost:8000
python -m http.server 8000
