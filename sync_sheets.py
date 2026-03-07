import csv
import json
import urllib.request
import os
import argparse

def download_and_process_sheets(url, output_file="exercices.json"):
    print(f"Téléchargement depuis Google Sheets: {url}")
    try:
        # Download the CSV
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            csv_data = response.read().decode('utf-8')

        # Parse CSV
        reader = csv.DictReader(csv_data.splitlines())
        exercices = []
        for row in reader:
            exercice = {
                "id": row.get("id", "").strip(),
                "nom": row.get("nom", "").strip(),
                "description": row.get("description", "").strip(),
                "series": int(row.get("series", 0)) if row.get("series", "").isdigit() else 0,
                "valeur": int(row.get("valeur", 0)) if row.get("valeur", "").isdigit() else 0,
                "type": row.get("type", "").strip(),
                "repos": int(row.get("repos", 0)) if row.get("repos", "").isdigit() else 0,
                "tags": row.get("tags", "").strip(),
                "importance": row.get("importance", "").strip(),
                "frequence": int(row.get("frequence", 0)) if row.get("frequence", "").isdigit() else 0,
                "video": row.get("video", "").strip()
            }
            exercices.append(exercice)

        # Write JSON
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(exercices, f, indent=4, ensure_ascii=False)

        print(f"Succès ! {len(exercices)} exercices ont été convertis et sauvegardés dans '{output_file}'.")

        # Also backup the downloaded CSV
        with open('exercices.csv', 'w', encoding='utf-8') as f:
            f.write(csv_data)
        print("Le fichier 'exercices.csv' local a également été mis à jour.")

    except Exception as e:
        print(f"Erreur lors de la synchronisation avec Google Sheets : {e}")
        print("Assurez-vous que le lien est bien un lien d'export CSV (se terminant par /export?format=csv)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synchroniser les exercices depuis un Google Sheets (format CSV).")
    parser.add_argument("url", help="L'URL publique d'exportation CSV du Google Sheets.")
    parser.add_argument("--output", default="exercices.json", help="Fichier de destination JSON.")

    args = parser.parse_args()
    download_and_process_sheets(args.url, args.output)