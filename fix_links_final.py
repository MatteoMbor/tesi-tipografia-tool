import json

FIXES = {
    'EXP-001': {'status': '[V-FULL]', 'note': 'verificato manualmente il 25/10/2026 (il 404 dello script e bot-blocking)'},
    'EXP-006': {'status': '[V-FULL]', 'note': 'verificato manualmente il 25/10/2026'},
    'ACA-006': {'url': 'https://www.type-together.com/', 'status': '[V-LANDING]',
                'note': 'pagina /research non raggiungibile (404 al 25/10/2026); white paper citato da letteratura secondaria'},
    'ACA-008': {'url': 'https://www.papress.com/', 'status': '[V-LANDING]',
                'note': 'scheda prodotto 3a edizione non raggiungibile; ISBN valido riportato nel campo DOI/ISBN'},
    'ETH-005': {'url': 'https://www.aprja.net/', 'status': '[V-LANDING]',
                'note': 'ID articolo 137452 non raggiungibile; cercare "Cramer crapularity" nell\'archivio APRJA'},
    'ACA-007': {'url': None, 'status': '[SEC]',
                'note': 'PDF Monoskop non piu raggiungibile; testo reperibile via JSTOR (Design Quarterly n.141) o in biblioteca'},
    'EPI-003': {'url': None, 'status': '[SEC]',
                'note': 'PDF Monoskop non piu raggiungibile; edizione Piet Zwart Institute reperibile in biblioteca o archivio autore'},
    'TMA-001': {'url': None, 'status': '[SEC]',
                'note': 'scheda MoMA 139315 non confermata dalla verifica manuale; opera documentata da archivio LettError e letteratura secondaria'},
    'VID-003': {'url': None, 'status': '[SEC]', 'note': 'video non reperibile alla verifica manuale; cercare nel canale YouTube ufficiale ATypI'},
    'VID-004': {'url': None, 'status': '[SEC]', 'note': 'video non reperibile alla verifica manuale; cercare nel canale YouTube ufficiale OFFF Festival'},
    'VID-006': {'url': None, 'status': '[SEC]', 'note': 'video non reperibile alla verifica manuale; cercare negli archivi SOTA / TypeCon'},
    'VID-007': {'url': None, 'status': '[SEC]', 'note': 'video non reperibile alla verifica manuale; cercare nel canale Vimeo ufficiale ECAL'},
    'TMA-006': {'status': '[DA VERIFICARE]', 'note': 'il server risponde 503 ai client automatici (25/10/2026): aprire manualmente underware.nl/case-studies/hoi/'},
    'EXP-012': {'url': None, 'status': '[V-FULL]', 'note': 'archivio personale del candidato (non pubblico): materiale di ricerca primario della tesi'},
}

for path in ['data/database_v2.json', 'data/database.json']:
    try:
        raw = json.load(open(path, encoding='utf-8'))
    except FileNotFoundError:
        print('skip (non trovato):', path)
        continue
    out = []
    changed = 0
    for rec in raw:
        clean = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in rec.items()}
        # compatibilita con entrambe le versioni di app.js: tags e operazioni come stringa
        for field in ('tags', 'typographic_operations'):
            if isinstance(clean.get(field), list):
                clean[field] = ', '.join(str(x).strip() for x in clean[field] if str(x).strip())
        rid = clean.get('id', '')
        if rid in FIXES:
            fix = FIXES[rid]
            if 'url' in fix:
                clean['url'] = fix['url']
            if 'status' in fix:
                clean['status'] = fix['status']
            if fix.get('note'):
                base = clean.get('accessibility', '') or ''
                clean['accessibility'] = (base + '  •  Nota link: ' + fix['note']).strip()
            changed += 1
        out.append(clean)
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'OK: {path} — {len(out)} record, {changed} corretti')