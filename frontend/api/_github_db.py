import os
import json
import base64
import requests as http

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
GITHUB_REPO = os.environ.get('GITHUB_REPO', 'taskymonk/TM-FinSites')
GITHUB_API = 'https://api.github.com'
GITHUB_BRANCH = os.environ.get('GITHUB_BRANCH', 'main')

def _headers():
    return {'Authorization': f'Bearer {GITHUB_TOKEN}', 'Accept': 'application/vnd.github.v3+json'}

def read_json(path):
    try:
        resp = http.get(f'{GITHUB_API}/repos/{GITHUB_REPO}/contents/{path}', headers=_headers(), params={'ref': GITHUB_BRANCH}, timeout=15)
        if resp.status_code != 200:
            return None
        content = base64.b64decode(resp.json()['content']).decode('utf-8')
        return json.loads(content)
    except Exception:
        return None

def write_json(path, data, message='auto: update'):
    try:
        url = f'{GITHUB_API}/repos/{GITHUB_REPO}/contents/{path}'
        content_b64 = base64.b64encode(json.dumps(data, indent=2, default=str).encode('utf-8')).decode('utf-8')
        body = {'message': message, 'content': content_b64, 'branch': GITHUB_BRANCH}
        existing = http.get(url, headers=_headers(), params={'ref': GITHUB_BRANCH}, timeout=10)
        if existing.status_code == 200:
            body['sha'] = existing.json()['sha']
        resp = http.put(url, headers=_headers(), json=body, timeout=15)
        return resp.status_code in (200, 201)
    except Exception:
        return False

def list_dir(path):
    try:
        resp = http.get(f'{GITHUB_API}/repos/{GITHUB_REPO}/contents/{path}', headers=_headers(), params={'ref': GITHUB_BRANCH}, timeout=15)
        if resp.status_code != 200:
            return []
        items = resp.json()
        if not isinstance(items, list):
            return []
        return [f['name'] for f in items if f['type'] == 'file' and f['name'].endswith('.json')]
    except Exception:
        return []

def count_files(path):
    return len(list_dir(path))

def read_all_json(path, limit=100):
    files = list_dir(path)
    results = []
    for fname in sorted(files, reverse=True)[:limit]:
        data = read_json(f'{path}/{fname}')
        if data:
            results.append(data)
    return results
