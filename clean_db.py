import json

path = 'data/database_v2.json'
raw = json.load(open(path, encoding='utf-8'))
out = []
for rec in raw:
    clean = {}
    for k, v in rec.items():
        key = k.strip()
        if isinstance(v, str):
            v = v.strip()
        clean[key] = v
    out.append(clean)
json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'OK: {len(out)} record puliti (chiavi e valori senza spazi finali)')