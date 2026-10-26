import json, csv, re
import urllib.request, urllib.error

DB = 'data/database_v2.json'
YT_OK = re.compile(r'^https?://(www\.)?youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$')

def load(path):
    raw = json.load(open(path, encoding='utf-8'))
    return [{k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in r.items()} for r in raw]

def check(url, timeout=20):
    req = urllib.request.Request(url, headers={'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) thesis-link-audit'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        return 'ERR:' + type(e).__name__

rows = []
for r in load(DB):
    rid, url = r.get('id', '?'), (r.get('url') or '').strip()
    warn = ''
    if not url:
        status = 'NULL'
    elif not url.startswith('http'):
        status = 'PLACEHOLDER'
    else:
        if 'youtube.com/watch' in url and not YT_OK.match(url):
            warn = 'ID YouTube malformato'
        status = check(url)
    rows.append([rid, status, warn, url])
    print(f'{rid:8} {str(status):>10}  {warn:24} {url}')

with open('data/link_audit.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['id', 'status', 'warning', 'url'])
    w.writerows(rows)

bad = [x for x in rows if x[1] not in (200, 'NULL')]
print(f'\nTotali: {len(rows)} | OK: {sum(1 for x in rows if x[1]==200)} | Da sistemare: {len(bad)}')
print('Report completo in data/link_audit.csv')