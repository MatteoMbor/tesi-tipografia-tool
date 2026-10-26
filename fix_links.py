import json

FIX_URL = {
    'ETH-005': 'https://aprja.net/article/view/137452',
    'TMD-002': 'https://paperjs.org/',
    'EXP-001': 'https://dia.studio/work/',
    'EXP-006': 'https://velvetyne.fr/about/',
    'PRJ-009': 'https://threejs.org/examples/?q=typography',
    'VID-006': 'https://www.youtube.com/results?search_query=Just+van+Rossum+30+Years+of+Beowolf+TypeCon',
    'VID-007': 'https://vimeo.com/search?q=J%C3%BCrg%20Lehni%20Of%20Tools%2C%20Interfaces%20and%20Drawing%20Machines',
}
FIX_STATUS = {
    'VID-006': '[DA VERIFICARE]',
    'VID-007': '[DA VERIFICARE]',
    'ACA-006': '[V-LANDING]',
    'ETH-004': '[V-LANDING]',
    'ETH-010': '[V-LANDING]',
    'AI-011': '[V-LANDING]',
}
NULL_URL = {'EXP-012'}

for path in ['data/database_v2.json', 'data/database.json']:
    try:
        raw = json.load(open(path, encoding='utf-8'))
    except FileNotFoundError:
        print('skip (non trovato):', path)
        continue
    out = []
    for rec in raw:
        clean = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in rec.items()}
        rid = clean.get('id', '')
        if rid in FIX_URL:
            clean['url'] = FIX_URL[rid]
        if rid in FIX_STATUS:
            clean['status'] = FIX_STATUS[rid]
        if rid in NULL_URL:
            clean['url'] = None
            clean['accessibility'] = 'Archivio personale del candidato (non pubblico)'
        out.append(clean)
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('OK:', path, '-', len(out), 'record normalizzati')
    