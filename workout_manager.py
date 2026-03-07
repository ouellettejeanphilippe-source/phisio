import json
import os

def load_data():
    """Charge les données des exercices et des plans depuis les fichiers JSON."""
    exercices = []
    plans = []

    if os.path.exists('exercices.json'):
        with open('exercices.json', 'r', encoding='utf-8') as f:
            exercices = json.load(f)

    if os.path.exists('plans.json'):
        with open('plans.json', 'r', encoding='utf-8') as f:
            plans = json.load(f)

    return exercices, plans

def get_exercises_by_tag(exercices, tag):
    """Filtre les exercices contenant un tag spécifique."""
    return [ex for ex in exercices if tag.lower() in ex.get('tags', '').lower()]

def search_exercises(exercices, keyword):
    """Recherche des exercices par mots-clés dans la description ou le nom."""
    keyword_lower = keyword.lower()
    results = []
    for ex in exercices:
        nom = ex.get('nom', '').lower()
        desc = ex.get('description', '').lower()
        if keyword_lower in nom or keyword_lower in desc:
            results.append(ex)
    return results

def get_plan_details(exercices, plans, plan_id):
    """Récupère un programme complet avec les descriptions détaillées de chaque exercice."""
    plan = next((p for p in plans if p.get('id') == plan_id), None)
    if not plan:
        return None

    plan_details = {
        'id': plan.get('id'),
        'nom': plan.get('nom'),
        'description': plan.get('description'),
        'goal': plan.get('goal'),
        'exercices': []
    }

    exercice_ids = plan.get('exercices_ids', [])
    for ex_id in exercice_ids:
        ex = next((e for e in exercices if e.get('id') == ex_id), None)
        if ex:
            plan_details['exercices'].append(ex)

    return plan_details

def export_plan_to_markdown(exercices, plans, plan_id, filename):
    """Exporte un plan d'entraînement sous format Markdown."""
    plan = get_plan_details(exercices, plans, plan_id)
    if not plan:
        print(f"Erreur : Plan avec l'ID {plan_id} introuvable.")
        return False

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(f"# Programme : {plan['nom']}\n\n")
        f.write(f"**Objectif (fréquence recommandée):** {plan['goal']} fois par semaine\n")
        f.write(f"**Description:** {plan['description']}\n\n")
        f.write("## Exercices\n\n")

        for idx, ex in enumerate(plan['exercices'], 1):
            f.write(f"### {idx}. {ex.get('nom')}\n")
            f.write(f"- **Tags:** {ex.get('tags')}\n")
            f.write(f"- **Séries/Répétitions:** {ex.get('series')} x {ex.get('valeur')} {ex.get('type')}\n")
            f.write(f"- **Repos:** {ex.get('repos')} secondes\n")
            f.write(f"- **Description:** {ex.get('description')}\n")
            if ex.get('video'):
                f.write(f"- **Lien (mot-clé):** `{ex.get('video')}`\n")
            f.write("\n")

    print(f"Le plan a été exporté avec succès dans '{filename}'.")
    return True

if __name__ == '__main__':
    import sys
    import argparse

    parser = argparse.ArgumentParser(description="Gestionnaire d'entraînement")
    parser.add_argument('--export', type=int, help="ID du plan à exporter en Markdown")
    parser.add_argument('--output', type=str, default="plan_export.md", help="Nom du fichier de sortie")
    parser.add_argument('--search', type=str, help="Recherche un exercice par mot-clé")
    parser.add_argument('--tag', type=str, help="Filtre les exercices par tag")

    args = parser.parse_args()

    exercices, plans = load_data()

    if not exercices or not plans:
        print("Erreur : Impossible de charger les données. Vérifiez que exercices.json et plans.json existent.")
        sys.exit(1)

    if args.export:
        export_plan_to_markdown(exercices, plans, args.export, args.output)
    elif args.search:
        results = search_exercises(exercices, args.search)
        print(f"--- Résultats de recherche pour '{args.search}' ---")
        for ex in results:
            print(f"- {ex['nom']} (ID: {ex['id']})")
    elif args.tag:
        results = get_exercises_by_tag(exercices, args.tag)
        print(f"--- Exercices avec le tag '{args.tag}' ---")
        for ex in results:
            print(f"- {ex['nom']} (ID: {ex['id']})")
    else:
        print("Bienvenue dans le gestionnaire d'entraînement.")
        print(f"{len(exercices)} exercices et {len(plans)} plans chargés.")
        print("Utilisez --help pour voir les options disponibles.")
