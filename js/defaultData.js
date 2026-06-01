const DEFAULT_DB = {
  "exercices": [
    {
      "id": "1",
      "nom": "Pompes",
      "tags": "Pectoraux, Triceps",
      "series": 3,
      "valeur": 15,
      "repos": 60,
      "description": "Exercice de base au poids du corps",
      "type": "reps",
      "tagsArray": [
        "Pectoraux",
        "Triceps"
      ]
    },
    {
      "id": "2",
      "nom": "Traction",
      "tags": "Dos, Biceps",
      "series": 3,
      "valeur": 8,
      "repos": 90,
      "description": "Tractions pronation ou supination",
      "type": "reps",
      "tagsArray": [
        "Dos",
        "Biceps"
      ]
    },
    {
      "id": "3",
      "nom": "Squat",
      "tags": "Jambes, Fessiers",
      "series": 4,
      "valeur": 20,
      "repos": 60,
      "description": "Flexion des jambes sans poids",
      "type": "reps",
      "tagsArray": [
        "Jambes",
        "Fessiers"
      ]
    },
    {
      "id": "4",
      "nom": "Planche",
      "tags": "Abdos, Gainage",
      "series": 3,
      "valeur": 60,
      "repos": 45,
      "description": "Maintien de la position horizontale",
      "type": "secs",
      "tagsArray": [
        "Abdos",
        "Gainage"
      ]
    },
    {
      "id": "5",
      "nom": "Crunch",
      "tags": "Abdos",
      "series": 3,
      "valeur": 20,
      "repos": 45,
      "description": "Enroulement vert\u00e9bral",
      "type": "reps",
      "tagsArray": [
        "Abdos"
      ]
    },
    {
      "id": "6",
      "nom": "Fentes",
      "tags": "Jambes",
      "series": 3,
      "valeur": 15,
      "repos": 60,
      "description": "Fentes altern\u00e9es (par jambe)",
      "type": "reps",
      "tagsArray": [
        "Jambes"
      ]
    },
    {
      "id": "7",
      "nom": "Dips",
      "tags": "Triceps, Pectoraux",
      "series": 3,
      "valeur": 12,
      "repos": 60,
      "description": "Sur chaise ou barres parall\u00e8les",
      "type": "reps",
      "tagsArray": [
        "Triceps",
        "Pectoraux"
      ]
    },
    {
      "id": "8",
      "nom": "Burpees",
      "tags": "Cardio, Corps entier",
      "series": 3,
      "valeur": 10,
      "repos": 60,
      "description": "Encha\u00eenement complet avec saut",
      "type": "reps",
      "tagsArray": [
        "Cardio",
        "Corps entier"
      ]
    },
    {
      "id": "9",
      "nom": "Mountain Climbers",
      "tags": "Cardio, Abdos",
      "series": 3,
      "valeur": 40,
      "repos": 45,
      "description": "Mouvements dynamiques des jambes",
      "type": "secs",
      "tagsArray": [
        "Cardio",
        "Abdos"
      ]
    },
    {
      "id": "10",
      "nom": "Corde \u00e0 sauter",
      "tags": "Cardio",
      "series": 3,
      "valeur": 120,
      "repos": 60,
      "description": "Sauts continus",
      "type": "secs",
      "tagsArray": [
        "Cardio"
      ]
    }
  ],
  "plans": [
    {
      "id": "p1",
      "nom": "Corps Complet Express",
      "description": "S\u00e9ance rapide pour tout le corps",
      "exercices_ids": [
        "1",
        "3",
        "4",
        "8"
      ]
    },
    {
      "id": "p2",
      "nom": "Haut du corps",
      "description": "Focus Pectoraux, Dos, Triceps",
      "exercices_ids": [
        "1",
        "2",
        "7"
      ]
    },
    {
      "id": "p3",
      "nom": "Bas du corps & Cardio",
      "description": "Jambes, Fessiers et Rythme cardiaque",
      "exercices_ids": [
        "3",
        "6",
        "9",
        "10"
      ]
    },
    {
      "id": "p4",
      "nom": "Abdos & Gainage",
      "description": "Renforcement de la sangle abdominale",
      "exercices_ids": [
        "4",
        "5",
        "9"
      ]
    }
  ]
};
