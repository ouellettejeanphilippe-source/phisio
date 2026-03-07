import csv
import json

raw_data = """id	nom	description	goal	exercices_ids
1	Santé Pelvienne (Alta)	Focus plancher pelvien et posture sur ballon.	5	1,2,3,4,5
2	Mobilité Thoracique (PDF 1)	Ouverture thoracique et renforcement du haut du dos.	3	6,7,8,9,10,11,12,13,14
3	Stabilité Épaules (PDF 2)	Stabilisation scapulaire et rotateurs avec élastique.	3	15,16,17,18
4	Posture & Équilibre (PDF 3)	Grandissement postural et étirements complets.	4	19,20,21,22,23,24,25,26,27,28
5	Core & Chaîne Postérieure	Gainage profond, Bird-Dog et travail spécifique sur ballon.	3	29,30,31
6	Routine Lundi	Pelvien, Thoracique et Posture.	1	1,2,3,6,7,19,23
7	Routine Mardi	Scapulaire, Postural et Core.	1	1,15,16,19,20,22,29
8	Routine Mercredi	Pelvien, Mobilité et Ballon.	1	1,2,3,5,26,31
9	Routine Jeudi	Thoracique, Épaules et Gainage.	1	1,4,6,7,8,15,17,23
10	Routine Vendredi	Postural, Jambes et Étirements.	1	1,19,21,22,24,27,28
11	Routine Samedi	Intensif : Core et Scapulaire.	1	1,5,11,15,18,29,30
12	Routine Dimanche	Récupération : Mobilité et Étirements.	1	1,3,19,26,27,28,31"""

# Write to CSV
with open('plans.csv', 'w', encoding='utf-8') as f:
    # Convert tab-separated to comma-separated
    writer = csv.writer(f)
    for line in raw_data.strip().split('\n'):
        writer.writerow(line.split('\t'))

# Parse for JSON
lines = raw_data.strip().split('\n')
headers = lines[0].split('\t')

data = []
for line in lines[1:]:
    row = line.split('\t')
    item = {}
    for i, h in enumerate(headers):
        val = row[i]
        if h in ['id', 'goal']:
            val = int(val)
        elif h == 'exercices_ids':
            val = [int(x) for x in val.split(',')]
        item[h] = val
    data.append(item)

# Write to JSON
with open('plans.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Files plans.csv and plans.json created successfully.")
