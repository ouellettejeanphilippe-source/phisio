# Spécifications et Fonctionnalités V3 (Refonte Majeure)

Ce document liste les fonctionnalités prévues pour la refonte de FitTrack Pro afin de la rendre "bien faite, utile, motivante et capable d'aller fetch des exercices pertinents sur le Web".

## 1. Bibliothèque Dynamique et "Web Fetching" (L'Intelligence)
L'application ne doit plus se limiter à une liste statique. Elle doit devenir un moteur de recherche.
*   **Intégration d'API d'Exercices (ex: Wger, ExerciseDB) :** Recherche en temps réel d'exercices avec des requêtes filtrées (équipement, groupe musculaire).
*   **Scraping / Fetching de Médias :** Récupération automatique de courtes démonstrations (vidéos muettes ou GIFs/SVGs) depuis le web pour chaque nouvel exercice importé.
*   **Génération et Alternatives :** Un système qui propose l'alternative la plus pertinente (ex: "Machine prise ? Fais cet exercice aux haltères qui cible les mêmes muscles").

## 2. Utilité Maximale et Suivi Sportif (La Performance)
L'outil doit faire le travail cognitif à la place de l'utilisateur.
*   **Surcharge Progressive Automatisée :** L'app analyse la séance précédente et propose automatiquement d'ajouter +1kg, +1 rep, ou +5 secondes.
*   **Modalités d'Entraînement Avancées :** Prise en charge fluide du poids, des répétitions, de l'isométrie (planches), du temps, et des drop sets. (Migration vers Pattern Stratégie).
*   **Heatmap Musculaire Dynamique :** Une visualisation du corps qui se colore en fonction de la fatigue et de la récupération des muscles travaillés au cours des 7 derniers jours.

## 3. Motivation et Gamification (Le "Hook")
L'app doit donner envie d'être ouverte tous les jours, avec des retours très satisfaisants.
*   **Célébrations Visuelles et Haptiques (Joy of Use) :** Des animations fluides (gradients "Candy" vibrants, particules) et des vibrations haptiques satisfaisantes à la fin de chaque série.
*   **Système de Streaks (Séries) et XP :** Gagner des niveaux par groupe musculaire. Par exemple, "Épaules niveau 12".
*   **Mode "Focus" d'Entraînement :** Une interface en plein écran, sans distraction, mode sombre profond (AMOLED), avec de grands chiffres pour les timers.

## 4. Interface (UI/UX) "Premium"
Inspiration iOS / Samsung One UI 8.5 pour que l'app paraisse native.
*   **Navigation "Bottom Island" :** Une barre de navigation flottante avec effet "Glassmorphism" (flou profond) pour une utilisation ergonomique.
*   **Gestes Fluides :** Glisser pour valider, "Pull-to-refresh".

## 5. Fondation Technique (Sous le capot)
*   **Architecture "Local-First" PWA :** L'application fonctionne à 100 % hors-ligne (accès instantané) et se synchronise discrètement.
*   **Refonte du Workout Engine :** Utilisation du Pattern Stratégie pour gérer les différents types d'exercices.
