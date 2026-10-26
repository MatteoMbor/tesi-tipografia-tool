import json, csv, re, ssl
import urllib.request, urllib.error
from urllib.request import Request

DB = 'data/database_v2.json'
YT_OK = re.compile(r'^https?://(www\.)?youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$')

# User-Agent realistico per evitare blocchi
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

def load(path):
    raw = json.load(open(path, encoding='utf-8'))
    return [{k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in r.items()} for r in raw]

def check(url, timeout=30):
    """Controlla un URL con User-Agent realistico e gestione errori robusta"""
    if not url or not url.startswith('http'):
        return 'INVALID', ''
    
    # Crea contesto SSL permissivo (alcuni siti hanno certificati vecchi)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = Request(url, headers=HEADERS, method='HEAD')
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
            return r.status, ''
    except urllib.error.HTTPError as e:
        # 403/429 spesso significano "il sito esiste ma blocca gli script"
        if e.code in (403, 429, 405, 501):
            return 'EXISTS_BUT_BLOCKED', str(e.code)
        return e.code, str(e)
    except Exception as e:
        return 'ERR', type(e).__name__

rows = []
for r in load(DB):
    rid, url = r.get('id', '?'), (r.get('url') or '').strip()
    warn = ''
    if not url:
        status = 'NULL'
    elif not url.startswith('http'):
        status = 'PLACEHOLDER'
    else:
        # Controlla formato YouTube
        if 'youtube.com/watch' in url and not YT_OK.match(url):
            warn = 'ID YouTube malformato'
        status, err_detail = check(url)
    rows.append([rid, status, warn, url])
    print(f'{rid:8} {str(status):>20}  {warn:24} {url}')

with open('data/link_audit_v2.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['id', 'status', 'warning', 'url'])
    w.writerows(rows)

bad = [x for x in rows if x[1] not in (200, 'NULL', 'EXISTS_BUT_BLOCKED')]
print(f'\nTotali: {len(rows)} | OK: {sum(1 for x in rows if x[1]==200)} | Bloccati ma esistenti: {sum(1 for x in rows if x[1]=="EXISTS_BUT_BLOCKED")} | Da sistemare: {len(bad)}')
print('Report completo in data/link_audit_v2.csv')