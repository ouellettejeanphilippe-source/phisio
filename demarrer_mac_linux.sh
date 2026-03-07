#!/bin/bash
echo "Lancement du serveur local FitTrack Pro..."
echo "Le navigateur va s'ouvrir sur http://localhost:8000"

# Détecter l'OS pour ouvrir le navigateur automatiquement
if which xdg-open > /dev/null
then
  xdg-open http://localhost:8000 &
elif which open > /dev/null
then
  open http://localhost:8000 &
fi

python3 -m http.server 8000
