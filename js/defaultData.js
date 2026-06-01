const DEFAULT_DB = {
  "exercices": [
    {
      "id": "1",
      "nom": "Exercice de Kegel avec Expiration",
      "tags": "Santé Pelvienne, Respiration, Alta",
      "series": 2,
      "valeur": 10,
      "repos": 60,
      "description": "Contractez le plancher pelvien pendant l'expiration buccale, puis relâchez complètement pendant l'inspiration nasale. Gardez le ventre souple.",
      "type": "reps",
      "tagsArray": [
        "Santé Pelvienne",
        "Respiration",
        "Alta"
      ]
    },
    {
      "id": "2",
      "nom": "Rotation des hanches assis",
      "tags": "Santé Pelvienne, Mobilité, Alta",
      "series": 3,
      "valeur": 30,
      "repos": 30,
      "description": "Assis, effectuez de rotations avec le bassin pour mobiliser les hanches et le bas du dos.",
      "type": "reps",
      "tagsArray": [
        "Santé Pelvienne",
        "Mobilité",
        "Alta"
      ]
    },
    {
      "id": "3",
      "nom": "Huit de l'infini",
      "tags": "Thoracique, Mobilité, Alta",
      "series": 2,
      "valeur": 20,
      "repos": 30,
      "description": "Maintenez vos mains sur vos coudes opposés et dessinez un chiffre huit horizontal (symbole de l'infini) devant vous. Laissez le tronc suivre.",
      "type": "reps",
      "tagsArray": [
        "Thoracique",
        "Mobilité",
        "Alta"
      ]
    },
    {
      "id": "4",
      "nom": "Étirement du dos vers l'arrière",
      "tags": "Postural, Extension, Alta",
      "series": 3,
      "valeur": 10,
      "repos": 45,
      "description": "Effectuez une extension du dos en pour ouvrir la cage thoracique et étirer les abdominaux.",
      "type": "reps",
      "tagsArray": [
        "Postural",
        "Extension",
        "Alta"
      ]
    },
    {
      "id": "5",
      "nom": "Équilibre sur ballon de stabilité",
      "tags": "Stabilité, Core, Alta",
      "series": 2,
      "valeur": 60,
      "repos": 45,
      "description": "Maintenez une position stable sur le ballon. Pour augmenter la difficulté, essayez de lever un talon ou un pied légèrement.",
      "type": "secs",
      "tagsArray": [
        "Stabilité",
        "Core",
        "Alta"
      ]
    },
    {
      "id": "6",
      "nom": "Glissement des bras au mur",
      "tags": "Thoracique, Posture, PDF 1",
      "series": 2,
      "valeur": 20,
      "repos": 45,
      "description": "Assis au sol, dos et fesses contre le mur. Appuyez la tête (menton rentré), épaules, coudes et poignets au mur (coudes à 90 degrés). Glissez les bras vers le haut.",
      "type": "reps",
      "tagsArray": [
        "Thoracique",
        "Posture",
        "PDF 1"
      ]
    },
    {
      "id": "7",
      "nom": "Rétraction des omoplates (Bras hauts)",
      "tags": "Dos, Renforcement, PDF 1",
      "series": 2,
      "valeur": 20,
      "repos": 45,
      "description": "Couché sur le ventre, bras allongés vers le haut, pouces vers le plafond. Soulevez coudes et mains en rapprochant et abaissant les omoplates.",
      "type": "reps",
      "tagsArray": [
        "Dos",
        "Renforcement",
        "PDF 1"
      ]
    },
    {
      "id": "8",
      "nom": "Rétraction des omoplates (Mains à la tête)",
      "tags": "Dos, Renforcement, PDF 1",
      "series": 2,
      "valeur": 10,
      "repos": 45,
      "description": "Couché sur le ventre, mains derrière la tête. Soulevez les coudes de la surface en rapprochant vos omoplates ensemble sans tirer sur la nuque.",
      "type": "reps",
      "tagsArray": [
        "Dos",
        "Renforcement",
        "PDF 1"
      ]
    },
    {
      "id": "9",
      "nom": "Rétraction des omoplates (Bras en W)",
      "tags": "Dos, Renforcement, PDF 1",
      "series": 2,
      "valeur": 10,
      "repos": 45,
      "description": "Couché sur le ventre, bras vers le haut, coudes fléchis à 90 degrés (forme de W), pouces vers le haut. Soulevez coudes et mains en serrant les omoplates.",
      "type": "reps",
      "tagsArray": [
        "Dos",
        "Renforcement",
        "PDF 1"
      ]
    },
    {
      "id": "10",
      "nom": "Planche latérale avec extension et abduction",
      "tags": "Core, Fessiers, PDF 1",
      "series": 2,
      "valeur": 10,
      "repos": 45,
      "description": "En planche latérale sur les genoux, levez la jambe supérieure vers le haut et l'arrière en diagonale avec rotation externe (orteils vers le haut).",
      "type": "secs",
      "tagsArray": [
        "Core",
        "Fessiers",
        "PDF 1"
      ]
    },
    {
      "id": "11",
      "nom": "Planche latérale avec cercles de jambe",
      "tags": "Core, Fessiers, PDF 1",
      "series": 2,
      "valeur": 10,
      "repos": 45,
      "description": "En planche latérale sur les genoux, jambe supérieure tendue. Effectuez des cercles contrôlés, orteils pointés vers le haut pour engager les fessiers.",
      "type": "secs",
      "tagsArray": [
        "Core",
        "Fessiers",
        "PDF 1"
      ]
    },
    {
      "id": "12",
      "nom": "Redressement assis partiel",
      "tags": "Abdominaux, Renforcement, PDF 1",
      "series": 1,
      "valeur": 15,
      "repos": 0,
      "description": "Couché sur le dos, genoux pliés. Rentrez le menton. Soulevez tête et épaules en dirigeant les mains vers les genoux. Expirez en montant.",
      "type": "reps",
      "tagsArray": [
        "Abdominaux",
        "Renforcement",
        "PDF 1"
      ]
    },
    {
      "id": "13",
      "nom": "Maintien abdominal isométrique",
      "tags": "Abdominaux, Stabilité, PDF 1",
      "series": 1,
      "valeur": 15,
      "repos": 0,
      "description": "Couché sur le dos, écrasez le sol avec le bas du dos (nombril rentré). Soulevez les épaules et les pieds à quelques centimètres du sol.",
      "type": "secs",
      "tagsArray": [
        "Abdominaux",
        "Stabilité",
        "PDF 1"
      ]
    },
    {
      "id": "14",
      "nom": "Planche avec extension de la hanche",
      "tags": "Core, Fessiers, PDF 1",
      "series": 2,
      "valeur": 15,
      "repos": 45,
      "description": "En planche sur les coudes, soulevez une jambe étendue sans arquer le dos. Maintenez la ligne droite tête-épaules-bassin.",
      "type": "secs",
      "tagsArray": [
        "Core",
        "Fessiers",
        "PDF 1"
      ]
    },
    {
      "id": "15",
      "nom": "Série 5x5 Scapulaire (Y-U-T-W-I)",
      "tags": "Épaules, Posture, PDF 2",
      "series": 5,
      "valeur": 5,
      "repos": 30,
      "description": "Debout avec élastique. Formez successivement les lettres Y, U, T, W et I. Maintenez chaque position 3 secondes en gardant les omoplates basses.",
      "type": "reps",
      "tagsArray": [
        "Épaules",
        "Posture",
        "PDF 2"
      ]
    },
    {
      "id": "16",
      "nom": "Mouvement I-Y-T à quatre pattes",
      "tags": "Épaules, Stabilité, PDF 2",
      "series": 5,
      "valeur": 3,
      "repos": 30,
      "description": "À quatre pattes, soulevez le bras en avant (I), en diagonale (Y) puis sur le côté (T). Stabilisez bien l'omoplate pendant le mouvement.",
      "type": "reps",
      "tagsArray": [
        "Épaules",
        "Stabilité",
        "PDF 2"
      ]
    },
    {
      "id": "17",
      "nom": "Élévations latérales tronc penché",
      "tags": "Épaules, Dos, PDF 2",
      "series": 3,
      "valeur": 12,
      "repos": 45,
      "description": "Genoux fléchis, penché vers l'avant, dos droit. Soulevez les poids sur le côté en ligne avec les épaules sans avancer la tête.",
      "type": "reps",
      "tagsArray": [
        "Épaules",
        "Dos",
        "PDF 2"
      ]
    },
    {
      "id": "18",
      "nom": "Stabilisation avec adduction horizontale",
      "tags": "Pectoraux, Stabilité, PDF 2",
      "series": 3,
      "valeur": 12,
      "repos": 45,
      "description": "Dos sur le ballon (pont), corps en ligne droite. Levez les poids au plafond puis descendez-les sur les côtés avec coudes légèrement fléchis.",
      "type": "reps",
      "tagsArray": [
        "Pectoraux",
        "Stabilité",
        "PDF 2"
      ]
    },
    {
      "id": "19",
      "nom": "Auto-grandissement postural",
      "tags": "Posture, Cervical, PDF 3",
      "series": 1,
      "valeur": 10,
      "repos": 0,
      "description": "Debout, imaginez une ficelle au sommet de votre tête qui vous tire vers le plafond. Allongez la colonne en respirant normalement.",
      "type": "reps",
      "tagsArray": [
        "Posture",
        "Cervical",
        "PDF 3"
      ]
    },
    {
      "id": "20",
      "nom": "Extension et rétraction avec élastique",
      "tags": "Dos, Posture, PDF 3",
      "series": 2,
      "valeur": 10,
      "repos": 45,
      "description": "Debout, tirez l'élastique vers l'arrière le plus loin possible en collant les omoplates et en reculant les coudes sans monter les épaules.",
      "type": "reps",
      "tagsArray": [
        "Dos",
        "Posture",
        "PDF 3"
      ]
    },
    {
      "id": "21",
      "nom": "Toucher les orteils sur une jambe",
      "tags": "Équilibre, Jambes, PDF 3",
      "series": 4,
      "valeur": 10,
      "repos": 30,
      "description": "En équilibre sur une jambe, penchez-vous vers l'avant (dos droit) pour toucher le sol. Utilisez les ischio-jambiers pour revenir debout.",
      "type": "reps",
      "tagsArray": [
        "Équilibre",
        "Jambes",
        "PDF 3"
      ]
    },
    {
      "id": "22",
      "nom": "Squat bulgare (Pied arrière élevé)",
      "tags": "Jambes, Fessiers, PDF 3",
      "series": 4,
      "valeur": 10,
      "repos": 45,
      "description": "Position de fente, pied arrière élevé sur une marche. Fléchissez les genoux pour abaisser le corps sans déplacer le poids vers l'avant.",
      "type": "reps",
      "tagsArray": [
        "Jambes",
        "Fessiers",
        "PDF 3"
      ]
    },
    {
      "id": "23",
      "nom": "Planche abdominale classique",
      "tags": "Core, Renforcement, PDF 3",
      "series": 1,
      "valeur": 30,
      "repos": 0,
      "description": "En appui sur coudes et orteils, menton rentré. Soulevez le bassin pour créer une ligne droite. Ne laissez pas le bas du dos s'arquer.",
      "type": "secs",
      "tagsArray": [
        "Core",
        "Renforcement",
        "PDF 3"
      ]
    },
    {
      "id": "24",
      "nom": "Pompes sur genoux (Amplitude de mouvement augmentée)",
      "tags": "Pectoraux, Renforcement, PDF 3",
      "series": 3,
      "valeur": 10,
      "repos": 60,
      "description": "Mains sur haltères, descendez en un bloc (ligne droite tête-genoux). Les haltères permettent de descendre plus bas qu'au sol.",
      "type": "reps",
      "tagsArray": [
        "Pectoraux",
        "Renforcement",
        "PDF 3"
      ]
    },
    {
      "id": "25",
      "nom": "Renforcement en extension (Prone)",
      "tags": "Dos, Chaîne postérieure, PDF 3",
      "series": 2,
      "valeur": 10,
      "repos": 45,
      "description": "Couché sur le ventre, bras derrière la tête, menton rentré. Soulevez le haut du corps en rapprochant les omoplates sans lever les pieds.",
      "type": "reps",
      "tagsArray": [
        "Dos",
        "Chaîne postérieure",
        "PDF 3"
      ]
    },
    {
      "id": "26",
      "nom": "Enfiler l'aiguille (Rotation thoracique)",
      "tags": "Mobilité, Thoracique, PDF 3",
      "series": 2,
      "valeur": 10,
      "repos": 30,
      "description": "À quatre pattes, passez une main sous le corps pour créer une rotation, puis ouvrez grand vers le plafond. Suivez la main du regard.",
      "type": "reps",
      "tagsArray": [
        "Mobilité",
        "Thoracique",
        "PDF 3"
      ]
    },
    {
      "id": "27",
      "nom": "Étirement du muscle trapèze supérieur",
      "tags": "Cervical, Étirement, PDF 3",
      "series": 1,
      "valeur": 30,
      "repos": 0,
      "description": "Bras derrière le dos pour abaisser l'épaule. Inclinez la tête du côté opposé et tournez-la légèrement. Maintenez l'étirement.",
      "type": "secs",
      "tagsArray": [
        "Cervical",
        "Étirement",
        "PDF 3"
      ]
    },
    {
      "id": "28",
      "nom": "Étirement de l'élévateur de l'omoplate",
      "tags": "Cervical, Étirement, PDF 3",
      "series": 1,
      "valeur": 30,
      "repos": 0,
      "description": "Main derrière la fesse. Tournez la tête à 45 degrés opposés et regardez vers le bas (aisselle). Tirez doucement avec l'autre main.",
      "type": "secs",
      "tagsArray": [
        "Cervical",
        "Étirement",
        "PDF 3"
      ]
    },
    {
      "id": "29",
      "nom": "Mouvement Bird-Dog (Oiseau-Chien)",
      "tags": "Core, Stabilité, Ajouts",
      "series": 3,
      "valeur": 10,
      "repos": 45,
      "description": "À quatre pattes, tendez simultanément le bras et la jambe opposés en gardant le dos parfaitement stable.",
      "type": "reps",
      "tagsArray": [
        "Core",
        "Stabilité",
        "Ajouts"
      ]
    },
    {
      "id": "30",
      "nom": "Challenge Planche abdominale (2 minutes)",
      "tags": "Challenge, Core, Ajouts",
      "series": 1,
      "valeur": 120,
      "repos": 0,
      "description": "Maintenez la position de planche parfaite. Respirez profondément. Travail de l'endurance musculaire du centre.",
      "type": "secs",
      "tagsArray": [
        "Challenge",
        "Core",
        "Ajouts"
      ]
    },
    {
      "id": "31",
      "nom": "Série Y-U-T-W-I sur ballon de stabilité",
      "tags": "Dos, Épaules, Ajouts",
      "series": 3,
      "valeur": 10,
      "repos": 45,
      "description": "Ventre sur le ballon, enchaînez les positions de bras pour renforcer toute la chaîne postérieure et les fixateurs d'omoplates.",
      "type": "reps",
      "tagsArray": [
        "Dos",
        "Épaules",
        "Ajouts"
      ]
    },
    {
      "id": "32",
      "nom": "Happy Baby",
      "tags": "",
      "series": 1,
      "valeur": 300,
      "repos": 60,
      "description": "Happy Baby",
      "type": "secs",
      "tagsArray": []
    },
    {
      "id": "33",
      "nom": "Child's pose",
      "tags": "",
      "series": 1,
      "valeur": 300,
      "repos": 60,
      "description": "Child's pose",
      "type": "secs",
      "tagsArray": []
    },
    {
      "id": "34",
      "nom": "Étirement en chevalier",
      "tags": "",
      "series": 2,
      "valeur": 120,
      "repos": 30,
      "description": "Étirer l'aine avec les mains",
      "type": "secs",
      "tagsArray": []
    },
    {
      "id": "35",
      "nom": "Respirations avec lever de jambes",
      "tags": "",
      "series": 3,
      "valeur": 10,
      "repos": 30,
      "description": "En expirant, remonter les jambes perpendiculaires au sol",
      "type": "reps",
      "tagsArray": []
    },
    {
      "id": "36",
      "nom": "Planche",
      "tags": "",
      "series": 3,
      "valeur": 60,
      "repos": 60,
      "description": "Planche ben standard",
      "type": "secs",
      "tagsArray": []
    }
  ],
  "plans": [
    {
      "id": "p1",
      "nom": "Quotidien",
      "description": "Exercices à faire tous les jours (Freq 5)",
      "exercices_ids": [
        "1",
        "2",
        "3",
        "4",
        "5",
        "32",
        "33",
        "34",
        "35"
      ],
      "goal": 5
    },
    {
      "id": "p2",
      "nom": "Régulier",
      "description": "Exercices à faire 4 fois par semaine",
      "exercices_ids": [
        "19",
        "20",
        "21",
        "22",
        "23",
        "24",
        "25",
        "26",
        "27",
        "28"
      ],
      "goal": 4
    },
    {
      "id": "p3",
      "nom": "Hebdomadaire",
      "description": "Exercices à faire 3 fois par semaine",
      "exercices_ids": [
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "29",
        "30",
        "31"
      ],
      "goal": 3
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_DB };
}
