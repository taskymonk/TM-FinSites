from http.server import BaseHTTPRequestHandler
import json
import uuid
import re
import os
import base64
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs

import requests as http
import jwt
from bs4 import BeautifulSoup

# ==================== CONFIG ====================
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
GITHUB_REPO = os.environ.get('GITHUB_REPO', 'taskymonk/TM-FinSites')
GITHUB_API = 'https://api.github.com'
GITHUB_BRANCH = os.environ.get('GITHUB_BRANCH', 'main')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev_secret')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY = timedelta(hours=24)
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@finsites.in')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# ==================== GITHUB DB ====================
def _gh_headers():
    return {'Authorization': f'Bearer {GITHUB_TOKEN}', 'Accept': 'application/vnd.github.v3+json'}

def gh_read(path):
    try:
        r = http.get(f'{GITHUB_API}/repos/{GITHUB_REPO}/contents/{path}', headers=_gh_headers(), params={'ref': GITHUB_BRANCH}, timeout=15)
        if r.status_code != 200: return None
        return json.loads(base64.b64decode(r.json()['content']).decode('utf-8'))
    except: return None

def gh_write(path, data, msg='auto'):
    try:
        url = f'{GITHUB_API}/repos/{GITHUB_REPO}/contents/{path}'
        b64 = base64.b64encode(json.dumps(data, indent=2, default=str).encode('utf-8')).decode('utf-8')
        body = {'message': msg, 'content': b64, 'branch': GITHUB_BRANCH}
        ex = http.get(url, headers=_gh_headers(), params={'ref': GITHUB_BRANCH}, timeout=10)
        if ex.status_code == 200: body['sha'] = ex.json()['sha']
        return http.put(url, headers=_gh_headers(), json=body, timeout=15).status_code in (200, 201)
    except: return False

def gh_list(path):
    try:
        r = http.get(f'{GITHUB_API}/repos/{GITHUB_REPO}/contents/{path}', headers=_gh_headers(), params={'ref': GITHUB_BRANCH}, timeout=15)
        if r.status_code != 200: return []
        items = r.json()
        return [f['name'] for f in items if isinstance(items, list) and f.get('type') == 'file' and f['name'].endswith('.json')]
    except: return []

def gh_read_all(path, limit=200):
    results = []
    for fname in sorted(gh_list(path), reverse=True)[:limit]:
        d = gh_read(f'{path}/{fname}')
        if d: results.append(d)
    return results

# ==================== AUTH ====================
def create_token(email):
    return jwt.encode({'email': email, 'exp': datetime.now(timezone.utc) + JWT_EXPIRY}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token):
    try: return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except: return None

def get_admin(headers):
    cookie = headers.get('Cookie', '')
    token = None
    for part in cookie.split(';'):
        p = part.strip()
        if p.startswith('access_token='): token = p[len('access_token='):]
    if not token:
        auth = headers.get('Authorization', '')
        if auth.startswith('Bearer '): token = auth[7:]
    if not token: return None
    payload = verify_token(token)
    return payload.get('email') if payload else None

# ==================== AUDIT ENGINE ====================
REG_PATTERNS = {"ARN": r"ARN[-\s]?\d{4,7}", "EUIN": r"E\d{6}", "IRDAI": r"(?:IRDAI|irda)[-\s/]?\w{4,}",
    "SEBI_PMS": r"INP\d{6,}", "SEBI_AIF": r"IN/AIF/[\w\-/]+", "SEBI_RIA": r"INA[\d/]\w{4,}", "APRN": r"APRN[-\s]?\d{4,}"}
BIZ_MAP = {"MFD": {"regs": ["ARN","EUIN"], "kw": ["mutual fund","amfi","mfd","sip","systematic investment","mutual fund distributor"]},
    "Insurance": {"regs": ["IRDAI"], "kw": ["insurance","irdai","life insurance","general insurance","health insurance","posp","policy"]},
    "PMS": {"regs": ["SEBI_PMS","APRN"], "kw": ["portfolio management","pms","discretionary","non-discretionary","apmi"]},
    "AIF": {"regs": ["SEBI_AIF"], "kw": ["alternative investment","aif","category i","category ii","category iii"]},
    "SIF": {"regs": [], "kw": ["specialised investment fund","sif","nism-xxi"]},
    "RIA": {"regs": ["SEBI_RIA"], "kw": ["investment adviser","ria","sebi registered investment","advisory fee"]}}
STATES = ["andhra pradesh","assam","bihar","chhattisgarh","goa","gujarat","haryana","himachal","jharkhand","karnataka","kerala","madhya pradesh","maharashtra","manipur","meghalaya","mizoram","nagaland","odisha","punjab","rajasthan","sikkim","tamil nadu","telangana","tripura","uttar pradesh","uttarakhand","west bengal","delhi","chandigarh","puducherry","ladakh"]

def clean_html(soup):
    s = BeautifulSoup(str(soup), "html.parser")
    for t in s.find_all(["script","style","noscript","svg","link"]): t.decompose()
    return s

def detect_regs(text):
    found = {}
    for k, p in REG_PATTERNS.items():
        m = re.findall(p, text, re.IGNORECASE)
        if m: found[k] = list(set(m))
    return found

def detect_types(text, regs):
    det = []
    tl = text.lower()
    for bt, info in BIZ_MAP.items():
        sc = sum(3 for r in info["regs"] if r in regs) + sum(1 for kw in info["kw"] if kw in tl)
        if sc >= 2: det.append(bt)
    return det or ["Unknown"]

def extract_name(soup, url):
    og = soup.find("meta", property="og:site_name")
    if og and og.get("content","").strip(): return og["content"].strip()
    og2 = soup.find("meta", property="og:title")
    if og2 and og2.get("content","").strip():
        n = og2["content"].strip()
        if n.lower() not in ("home","homepage","index","welcome"): return re.split(r'[|\-]',n)[0].strip()
    c = clean_html(soup).get_text(separator=" ",strip=True)
    cm = re.search(r'\u00a9\s*\d{4}\s+([^.|,\n]{3,50})', c)
    if cm:
        n = cm.group(1).strip().rstrip('.')
        if n.lower() not in ("all rights reserved",): return n
    te = soup.find("title")
    if te and te.string:
        t = te.string.strip()
        if t.lower() not in ("home","homepage","index","welcome",""):
            for p in reversed(re.split(r'[|\-]',t)):
                pp = p.strip()
                if pp.lower() not in ("home","homepage","index","welcome",""): return pp
    try: return urlparse(url).hostname.replace("www.","").split(".")[0].title()
    except: return ""

def extract_addr(ct):
    tl = ct.lower()
    for label in ["registered office","office address","address:","office:"]:
        idx = tl.find(label)
        if idx != -1:
            sn = ct[idx:idx+300]
            pm = re.search(r'(.{0,150}?\d{6})', sn)
            if pm:
                a = re.sub(r'^(?:registered office|office address|address|office)\s*[:.]?\s*','',pm.group(0),flags=re.IGNORECASE).strip()
                if len(a) > 10: return a
    for m in re.finditer(r'(.{10,150}?\b(\d{6})\b)', ct):
        if any(s in m.group(1).lower() for s in STATES): return re.sub(r'^[\s,]+','',m.group(1)).strip()
    return ""

def extract_contact(soup, text):
    c = clean_html(soup).get_text(separator=" ",strip=True)
    return {"phones": list(set([re.sub(r'\s','',p.strip()) for p in re.findall(r'(?:\+91[-\s]?)?(?:\d[-\s]?){10}',c)]))[:5],
        "emails": list(set(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',c)))[:5], "address": extract_addr(c)}

def extract_officers(ct):
    officers = {}
    for rl, rk in [("principal officer","principal_officer"),("compliance officer","compliance_officer")]:
        idx = ct.lower().find(rl)
        if idx != -1:
            after = re.sub(r'^[:\-\s]+','',ct[idx+len(rl):idx+len(rl)+100].strip())
            words = [w for w in after.split() if w[0:1].isupper() and w.isalpha() and len(w)>1][:4]
            name = " ".join(words)
            if len(name)>3: officers[rk] = name
    return officers

def extract_social(soup):
    social = {}
    for link in soup.find_all("a",href=True):
        h = link["href"].lower()
        for n,d in {"linkedin":"linkedin.com","twitter":"twitter.com","youtube":"youtube.com","instagram":"instagram.com","facebook":"facebook.com","whatsapp":"wa.me"}.items():
            if d in h and n not in social: social[n] = link["href"]
    return social

def extract_services(tl):
    kw = {"Mutual Funds & SIP":["mutual fund","sip","elss"],"Life Insurance":["life insurance","term insurance","ulip"],
        "Health Insurance":["health insurance","mediclaim"],"General Insurance":["general insurance","motor insurance"],
        "PMS":["portfolio management","pms"],"Fixed Deposits / Bonds":["fixed deposit","bond","debenture"],
        "Tax Planning":["tax planning","income tax"],"Retirement Planning":["retirement","pension"],
        "Financial Planning":["financial planning","goal based"],"NRI Services":["nri"],
        "Loan / Credit":["loan","credit"],"Estate Planning":["estate planning","will","succession"]}
    return [s for s,ws in kw.items() if any(w in tl for w in ws)]

def compliance_checks(text, soup, types, regs, url, links):
    checks = []
    tl = text.lower()
    def add(cid,name,cat,sev,ok,det=""): checks.append({"id":cid,"name":name,"category":cat,"severity":sev,"status":"pass" if ok else "fail","detail":det})
    add("U1","SSL/HTTPS","Technical","critical",url.startswith("https"),"HTTPS")
    add("U2","Viewport","Technical","major",bool(soup.find("meta",attrs={"name":"viewport"})),"Mobile meta")
    add("U3","Title","Technical","minor",bool(soup.find("title") and soup.find("title").string),"Title tag")
    add("U5","Disclaimer","Compliance","critical","disclaimer" in links or "disclaimer" in tl,"Disclaimer")
    add("U6","Privacy","Compliance","critical","privacy" in links or "privacy policy" in tl,"Privacy policy")
    add("U7","Grievance","Compliance","critical","grievance" in links or "grievance" in tl,"Grievance")
    add("U8","Market Risk","Compliance","critical","subject to market risk" in tl or "market risks" in tl,"Market risk")
    add("U9","Past Performance","Compliance","major","past performance" in tl,"Past performance")
    add("U10","Registration","Compliance","critical",bool(regs),"Registrations" if regs else "None")
    add("U11","Contact","Content","major",bool(re.findall(r'[\w.+-]+@[\w.-]+\.\w{2,}',text)),"Email")
    if any(t in types for t in ["MFD","PMS","AIF","RIA","SIF"]):
        add("U12","SEBI SCORES","Compliance","major","scores.sebi.gov.in" in tl or "scores.sebi.gov.in" in links or "sebi scores" in tl or "scores portal" in tl,"SCORES")
    if "MFD" in types:
        add("M1","ARN","MFD","critical","ARN" in regs,str(regs.get("ARN",["N/A"])[0]))
        add("M2","EUIN","MFD","critical","EUIN" in regs,"EUIN")
        add("M3","AMFI Tagline","MFD","critical","amfi" in tl and ("registered" in tl or "distributor" in tl),"AMFI")
    if "Insurance" in types:
        add("I1","IRDAI License","Insurance","critical","IRDAI" in regs,"IRDAI")
        add("I3","Solicitation","Insurance","critical","subject matter of solicitation" in tl,"Solicitation")
    if "PMS" in types:
        add("P1","SEBI PMS","PMS","critical","SEBI_PMS" in regs or "APRN" in regs,"PMS reg")
    if "RIA" in types:
        add("R1","SEBI IA","RIA","critical","SEBI_RIA" in regs,"IA reg")
    return checks

def calc_scores(checks):
    if not checks: return {"overall_score":0,"compliance_score":0,"technical_score":0,"content_score":0,"total_checks":0,"passed":0,"failed":0,"warnings":0}
    w = {"critical":3,"major":2,"minor":1}
    cats = {"Technical":[],"Compliance":[],"Content":[]}
    for c in checks:
        placed = False
        for k in cats:
            if k.lower() in c["category"].lower(): cats[k].append(c); placed=True; break
        if not placed: cats["Compliance"].append(c)
    def sc(items):
        if not items: return 100
        t = sum(w.get(i["severity"],1) for i in items)
        p = sum(w.get(i["severity"],1) for i in items if i["status"]=="pass")
        return int((p/t)*100) if t else 100
    t,cn,co = sc(cats["Technical"]),sc(cats["Content"]),sc(cats["Compliance"])
    return {"overall_score":int(t*0.2+cn*0.3+co*0.5),"technical_score":t,"content_score":cn,"compliance_score":co,
        "total_checks":len(checks),"passed":sum(1 for c in checks if c["status"]=="pass"),"failed":sum(1 for c in checks if c["status"]=="fail"),"warnings":0}

def do_audit(url):
    aid = str(uuid.uuid4())
    try:
        if not url.startswith("http"): url = "https://"+url
        r = http.get(url, headers={"User-Agent":"Mozilla/5.0 Chrome/120"}, timeout=20, allow_redirects=True, verify=False)
        soup = BeautifulSoup(r.text,"html.parser")
        clean = clean_html(soup)
        text = clean.get_text(separator=" ",strip=True)
        links = " ".join([a.get_text(strip=True).lower()+" "+(a.get("href","").lower()) for a in soup.find_all("a",href=True)])
        regs = detect_regs(text); types = detect_types(text,regs)
        checks = compliance_checks(text,soup,types,regs,url,links); scores = calc_scores(checks)
        return {"audit_id":aid,"url":url,"status":"completed","detected_business_types":types,
            "detected_data":{"business_name":extract_name(soup,url),"registrations":regs,"contact":extract_contact(soup,text),
                "social_links":extract_social(soup),"services_detected":extract_services(text.lower()),"officers":extract_officers(text)},
            "compliance_report":{**scores,"checks":checks},"created_at":datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        return {"audit_id":aid,"url":url,"status":"failed","error":str(e),"detected_business_types":[],"detected_data":{},"compliance_report":{"overall_score":0,"checks":[]},"created_at":datetime.now(timezone.utc).isoformat()}

# ==================== HANDLER ====================
class handler(BaseHTTPRequestHandler):
    def _json(self, data, status=200, cookies=None):
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        if cookies:
            for c in cookies: self.send_header('Set-Cookie',c)
        self.end_headers()
        self.wfile.write(json.dumps(data,default=str).encode())

    def _err(self, msg, status=400): self._json({"detail":msg},status)
    def _body(self):
        l = int(self.headers.get('Content-Length',0))
        return json.loads(self.rfile.read(l)) if l>0 else {}
    def _path(self): return urlparse(self.path).path
    def _admin(self):
        a = get_admin(self.headers)
        if not a: self._err("Not authenticated",401)
        return a

    def do_OPTIONS(self):
        self.send_response(200)
        for k,v in [('Access-Control-Allow-Origin','*'),('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'),('Access-Control-Allow-Headers','Content-Type,Authorization,Cookie'),('Access-Control-Allow-Credentials','true')]:
            self.send_header(k,v)
        self.end_headers()

    def do_GET(self):
        p = self._path()
        if p == '/api/health': self._json({"api":"ok"})
        elif p == '/api/plans': self._json(gh_read('data/plans.json') or [])
        elif p == '/api/auth/me':
            a = get_admin(self.headers)
            self._json({"email":a,"name":"Admin","role":"admin"}) if a else self._err("Not authenticated",401)
        elif p == '/api/admin/stats': self._admin_stats()
        elif p == '/api/admin/submissions': self._admin_list()
        elif p.startswith('/api/admin/submissions/'): self._admin_detail(p.split('/api/admin/submissions/')[1].split('/')[0])
        elif p.startswith('/api/status/'): self._status(p.split('/api/status/')[1])
        elif p.startswith('/api/audit/'): self._audit_get(p.split('/api/audit/')[1].split('/')[0])
        elif p.startswith('/api/wizard/'): self._wiz_get(p.split('/api/wizard/')[1].split('/')[0])
        else: self._err("Not found",404)

    def do_POST(self):
        p = self._path(); b = self._body()
        if p == '/api/audit/scan': self._audit_scan(b)
        elif p == '/api/auth/login': self._login(b)
        elif p == '/api/auth/logout': self._json({"ok":True},cookies=['access_token=;HttpOnly;SameSite=Lax;Path=/;Max-Age=0'])
        elif p == '/api/wizard/start': self._wiz_start(b)
        elif '/submit' in p: self._wiz_submit(p.split('/api/wizard/')[1].split('/submit')[0])
        elif p == '/api/contact/enterprise': self._enterprise(b)
        else: self._err("Not found",404)

    def do_PUT(self):
        p = self._path(); b = self._body()
        if '/step/' in p:
            parts = p.split('/api/wizard/')[1]; sid=parts.split('/step/')[0]; step=parts.split('/step/')[1]
            self._wiz_step(sid,step,b)
        elif p.endswith('/status'):
            self._admin_status(p.split('/api/admin/submissions/')[1].split('/status')[0],b)
        elif p.endswith('/business-type'):
            self._audit_retype(p.split('/api/audit/')[1].split('/business-type')[0],b)
        elif p.endswith('/payment'):
            self._admin_pay(p.split('/api/admin/submissions/')[1].split('/payment')[0],b)
        else: self._err("Not found",404)

    def _login(self,b):
        e,pw = b.get('email',''),b.get('password','')
        if e.strip().lower()!=ADMIN_EMAIL.lower() or pw!=ADMIN_PASSWORD: self._err("Invalid credentials",401); return
        t = create_token(e)
        self._json({"email":e.strip().lower(),"name":"Admin","role":"admin"},cookies=[f'access_token={t};HttpOnly;SameSite=Lax;Path=/;Max-Age=86400'])

    def _audit_scan(self,b):
        url = b.get('url','')
        if not url: self._err("URL required"); return
        result = do_audit(url)
        gh_write(f"data/audits/{result['audit_id']}.json",result,f"audit: {url}")
        self._json(result)

    def _audit_get(self,aid):
        d = gh_read(f"data/audits/{aid}.json")
        self._json(d) if d else self._err("Not found",404)

    def _audit_retype(self,aid,b):
        d = gh_read(f"data/audits/{aid}.json")
        if not d: self._err("Not found",404); return
        d['detected_business_types'] = b.get('business_types',[])
        gh_write(f"data/audits/{aid}.json",d,"recheck")
        self._json(d)

    def _wiz_start(self,b):
        sid = str(uuid.uuid4()); pf = {}
        aid = b.get('audit_id')
        if aid:
            au = gh_read(f"data/audits/{aid}.json")
            if au and au.get('detected_data'):
                dd = au['detected_data']
                pf = {'step_1':{'business_types':au.get('detected_business_types',[])},'step_2':{'group_a':{'business_name':dd.get('business_name',''),'email':(dd.get('contact',{}).get('emails') or [''])[0],'phone':(dd.get('contact',{}).get('phones') or [''])[0],'address':dd.get('contact',{}).get('address','')}}}
        sess = {'session_id':sid,'audit_id':aid,'plan_id':b.get('plan_id','starter'),
            'contact':{'name':b.get('contact_name',''),'email':b.get('contact_email',''),'phone':b.get('contact_phone','')},
            'current_step':1,'status':'in_progress','business_types':pf.get('step_1',{}).get('business_types',[]),
            'data':pf,'prefilled_from_audit':bool(aid),'created_at':datetime.now(timezone.utc).isoformat()}
        gh_write(f"data/sessions/{sid}.json",sess,"wizard: new")
        self._json(sess)

    def _wiz_get(self,sid):
        d = gh_read(f"data/sessions/{sid}.json")
        self._json(d) if d else self._err("Not found",404)

    def _wiz_step(self,sid,step,b):
        d = gh_read(f"data/sessions/{sid}.json")
        if not d: self._err("Not found",404); return
        d.setdefault('data',{})[f'step_{step}'] = b.get('data',{})
        d['current_step'] = max(int(step),d.get('current_step',1))
        if step=='1' and 'business_types' in b.get('data',{}): d['business_types']=b['data']['business_types']
        gh_write(f"data/sessions/{sid}.json",d,f"step {step}")
        self._json(d)

    def _wiz_submit(self,sid):
        d = gh_read(f"data/sessions/{sid}.json")
        if not d: self._err("Not found",404); return
        if d.get('status')=='completed': self._err("Already submitted",400); return
        n = len(gh_list('data/submissions'))
        ref = f"FS-{datetime.now(timezone.utc).year}-{str(n+1).zfill(5)}"
        subid = str(uuid.uuid4())
        ct = d.get('contact',{}); ga = d.get('data',{}).get('step_2',{}).get('group_a',{})
        sub = {'submission_id':subid,'session_id':sid,'reference_number':ref,'audit_id':d.get('audit_id'),
            'client_name':ga.get('business_name',ct.get('name','')),'client_email':ga.get('email',ct.get('email','')),
            'client_phone':ct.get('phone',''),'business_types':d.get('business_types',[]),
            'plan':{'tier':d.get('plan_id','starter')},'status':'submitted',
            'status_history':[{'status':'submitted','at':datetime.now(timezone.utc).isoformat(),'by':'system','note':'Wizard completed'}],
            'data':d.get('data',{}),'payment':{'status':'pending'},'submitted_at':datetime.now(timezone.utc).isoformat()}
        gh_write(f"data/submissions/{ref}.json",sub,f"submit: {ref}")
        d['status']='completed'; gh_write(f"data/sessions/{sid}.json",d,"completed")
        self._json({'submission_id':subid,'reference_number':ref})

    def _status(self,sid):
        for f in gh_list('data/submissions'):
            d = gh_read(f'data/submissions/{f}')
            if d and (d.get('submission_id')==sid or d.get('reference_number')==sid):
                self._json({k:d.get(k) for k in ['submission_id','reference_number','client_name','status','plan','business_types','status_history','payment','submitted_at']})
                return
        self._err("Not found",404)

    def _enterprise(self,b):
        cid = str(uuid.uuid4())
        doc = {'contact_id':cid,'name':b.get('name',''),'email':b.get('email',''),'phone':b.get('phone',''),'company':b.get('company',''),'message':b.get('message',''),'created_at':datetime.now(timezone.utc).isoformat()}
        gh_write(f"data/contacts/{cid}.json",doc,f"enterprise: {b.get('name','')}")
        self._json({'contact_id':cid,'message':'Our team will contact you within 24 hours.'})

    def _admin_stats(self):
        if not self._admin(): return
        subs = gh_read_all('data/submissions',500)
        bs,bt = {},{}
        for s in subs:
            st = s.get('status','?'); bs[st]=bs.get(st,0)+1
            for t in s.get('business_types',[]): bt[t]=bt.get(t,0)+1
        self._json({'total_submissions':len(subs),'by_status':bs,'by_type':bt,'total_audits':len(gh_list('data/audits')),'enterprise_leads':len(gh_list('data/contacts'))})

    def _admin_list(self):
        if not self._admin(): return
        subs = gh_read_all('data/submissions',200)
        params = parse_qs(urlparse(self.path).query)
        sf = params.get('status',[None])[0]; sr = params.get('search',[None])[0]
        if sf: subs = [s for s in subs if s.get('status')==sf]
        if sr:
            sl = sr.lower()
            subs = [s for s in subs if sl in s.get('client_name','').lower() or sl in s.get('client_email','').lower() or sl in s.get('reference_number','').lower()]
        safe = [{k:s.get(k) for k in ['submission_id','reference_number','client_name','client_email','business_types','plan','status','payment','submitted_at']} for s in subs]
        self._json({'submissions':safe,'total':len(safe),'page':1,'pages':1})

    def _admin_detail(self,sid):
        if not self._admin(): return
        for f in gh_list('data/submissions'):
            d = gh_read(f'data/submissions/{f}')
            if d and d.get('submission_id')==sid: self._json(d); return
        self._err("Not found",404)

    def _admin_status(self,sid,b):
        a = self._admin()
        if not a: return
        for f in gh_list('data/submissions'):
            d = gh_read(f'data/submissions/{f}')
            if d and d.get('submission_id')==sid:
                d['status']=b.get('status',d['status'])
                d.setdefault('status_history',[]).append({'status':b['status'],'at':datetime.now(timezone.utc).isoformat(),'by':a,'note':b.get('note','')})
                gh_write(f'data/submissions/{f}',d,f"status: {b['status']}")
                self._json({'message':'Updated','status':b['status']}); return
        self._err("Not found",404)

    def _admin_pay(self,sid,b):
        a = self._admin()
        if not a: return
        for f in gh_list('data/submissions'):
            d = gh_read(f'data/submissions/{f}')
            if d and d.get('submission_id')==sid:
                d['payment']={'status':b.get('status','pending'),'amount':b.get('amount'),'method':b.get('method')}
                if b.get('status')=='received': d['status']='payment_received'
                d.setdefault('status_history',[]).append({'status':f"payment_{b.get('status')}",'at':datetime.now(timezone.utc).isoformat(),'by':a})
                gh_write(f'data/submissions/{f}',d,f"payment")
                self._json({'message':'Updated'}); return
        self._err("Not found",404)
