import json, shutil, os

path = os.path.join('data', 'database_v2.json')
shutil.copy(path, os.path.join('data', 'database_v2_backup.json'))

with open(path, encoding='utf-8') as f:
    raw = json.load(f)

# Campi che il tuo app.js attuale si aspetta come STRINGA separata da virgole
STRING_LIST_FIELDS = {'tags', 'typographic_operations'}
# Campi che app.js gestisce già bene sia come array sia come stringa
KEEP_ARRAY_FIELDS = {'tool_tags', 'topic_tags'}

clean = []
for rec in raw:
    out = {}
    for k, v in rec.items():
        key = k.strip()                      # rimuove lo spazio finale dalle chiavi
        if isinstance(v, str):
            v = v.strip()                    # rimuove lo spazio finale dai valori
        out[key] = v
    for field in STRING_LIST_FIELDS:
        val = out.get(field)
        if isinstance(val, list):
            out[field] = ', '.join(str(x).strip() for x in val if str(x).strip())
    for field in KEEP_ARRAY_FIELDS:
        val = out.get(field)
        if isinstance(val, str):
            out[field] = [s.strip() for s in val.split(',') if s.strip()]
        elif isinstance(val, list):
            out[field] = [str(x).strip() for x in val if str(x).strip()]
    clean.append(out)

with open(path, 'w', encoding='utf-8') as f:
    json.dump(clean, f, ensure_ascii=False, indent=2)

print(f'OK: {len(clean)} record normalizzati in {path}')
print('Backup creato in data/database_v2_backup.json')