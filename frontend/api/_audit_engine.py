import re
import uuid
import requests as http
from bs4 import BeautifulSoup
from datetime import datetime, timezone

REGISTRATION_PATTERNS = {
    "ARN": r"ARN[-\s]?\d{4,7}", "EUIN": r"E\d{6}", "IRDAI": r"(?:IRDAI|irda)[-\s/]?\w{4,}",
    "SEBI_PMS": r"INP\d{6,}", "SEBI_AIF": r"IN/AIF/[\w\-/]+", "SEBI_RIA": r"INA[\d/]\w{4,}", "APRN": r"APRN[-\s]?\d{4,}",
}
BUSINESS_TYPE_MAP = {
    "MFD": {"regs": ["ARN", "EUIN"], "keywords": ["mutual fund", "amfi", "mfd", "sip", "systematic investment", "mutual fund distributor"]},
    "Insurance": {"regs": ["IRDAI"], "keywords": ["insurance", "irdai", "life insurance", "general insurance", "health insurance", "posp", "policy"]},
    "PMS": {"regs": ["SEBI_PMS", "APRN"], "keywords": ["portfolio management", "pms", "discretionary", "non-discretionary", "apmi"]},
    "AIF": {"regs": ["SEBI_AIF"], "keywords": ["alternative investment", "aif", "category i", "category ii", "category iii"]},
    "SIF": {"regs": [], "keywords": ["specialised investment fund", "sif", "nism-xxi", "nism series xxi"]},
    "RIA": {"regs": ["SEBI_RIA"], "keywords": ["investment adviser", "ria", "sebi registered investment", "advisory fee"]},
}
INDIAN_STATES = ["andhra pradesh","assam","bihar","chhattisgarh","goa","gujarat","haryana","himachal","jharkhand","karnataka","kerala","madhya pradesh","maharashtra","manipur","meghalaya","mizoram","nagaland","odisha","punjab","rajasthan","sikkim","tamil nadu","telangana","tripura","uttar pradesh","uttarakhand","west bengal","delhi","chandigarh","puducherry","ladakh"]

def clean_soup(soup):
    s = BeautifulSoup(str(soup), "html.parser")
    for tag in s.find_all(["script", "style", "noscript", "svg", "link"]):
        tag.decompose()
    return s

def detect_registrations(text):
    found = {}
    for reg_type, pattern in REGISTRATION_PATTERNS.items():
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            found[reg_type] = list(set(matches))
    return found

def detect_business_types(text, registrations):
    detected = []
    text_lower = text.lower()
    for btype, info in BUSINESS_TYPE_MAP.items():
        score = sum(3 for reg in info["regs"] if reg in registrations) + sum(1 for kw in info["keywords"] if kw in text_lower)
        if score >= 2:
            detected.append(btype)
    return detected if detected else ["Unknown"]

def extract_business_name(soup, url):
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content", "").strip():
        return og_site["content"].strip()
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content", "").strip():
        name = og_title["content"].strip()
        if name.lower() not in ("home", "homepage", "index", "welcome"):
            return re.split(r'[|\-\u2013\u2014]', name)[0].strip()
    clean = clean_soup(soup)
    clean_text = clean.get_text(separator=" ", strip=True)
    cm = re.search(r'\u00a9\s*\d{4}\s+([^.|,\n]{3,50})', clean_text)
    if cm:
        name = cm.group(1).strip().rstrip('.')
        if name.lower() not in ("all rights reserved",):
            return name
    title_el = soup.find("title")
    if title_el and title_el.string:
        title = title_el.string.strip()
        if title.lower() not in ("home", "homepage", "index", "welcome", ""):
            for part in reversed(re.split(r'[|\-\u2013\u2014]', title)):
                p = part.strip()
                if p.lower() not in ("home", "homepage", "index", "welcome", ""):
                    return p
    h1 = soup.find("h1")
    if h1 and h1.get_text(strip=True) and len(h1.get_text(strip=True)) < 80:
        return h1.get_text(strip=True)
    try:
        from urllib.parse import urlparse
        return urlparse(url).hostname.replace("www.", "").split(".")[0].title()
    except:
        return ""

def extract_address(clean_text):
    text_lower = clean_text.lower()
    for label in ["registered office", "office address", "address:", "office:"]:
        idx = text_lower.find(label)
        if idx != -1:
            snippet = clean_text[idx:idx + 300]
            pin_match = re.search(r'(.{0,150}?\d{6})', snippet)
            if pin_match:
                addr = re.sub(r'^(?:registered office|office address|address|office)\s*[:.]?\s*', '', pin_match.group(0), flags=re.IGNORECASE).strip()
                if len(addr) > 10:
                    return addr
    for m in re.finditer(r'(.{10,150}?\b(\d{6})\b)', clean_text):
        if any(state in m.group(1).lower() for state in INDIAN_STATES):
            return re.sub(r'^[\s,]+', '', m.group(1)).strip()
    for m in re.finditer(r'(.{10,150}?\b(\d{6})\b)', clean_text):
        if any(w in m.group(1).lower() for w in ["road", "street", "market", "nagar", "colony", "sector", "block", "floor", "tower", "building", "plot"]):
            return m.group(1).strip()
    return ""

def extract_contact_info(soup, text):
    clean = clean_soup(soup)
    ct = clean.get_text(separator=" ", strip=True)
    emails = list(set(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', ct)))[:5]
    phones = list(set([re.sub(r'\s', '', p.strip()) for p in re.findall(r'(?:\+91[-\s]?)?(?:\d[-\s]?){10}', ct)]))[:5]
    return {"phones": phones, "emails": emails, "address": extract_address(ct)}

def extract_officers(clean_text):
    officers = {}
    for role_label, role_key in [("principal officer", "principal_officer"), ("compliance officer", "compliance_officer"), ("grievance officer", "grievance_officer")]:
        idx = clean_text.lower().find(role_label)
        if idx != -1:
            after = re.sub(r'^[:\-\u2013\s]+', '', clean_text[idx + len(role_label):idx + len(role_label) + 100].strip())
            words = []
            for word in after.split():
                if word[0].isupper() and word.isalpha() and len(word) > 1:
                    words.append(word)
                else:
                    break
                if len(words) >= 4:
                    break
            name = " ".join(words)
            if len(name) > 3:
                officers[role_key] = name
    return officers

def extract_social_links(soup):
    social = {}
    platforms = {"linkedin": "linkedin.com", "twitter": "twitter.com", "x": "x.com", "youtube": "youtube.com", "instagram": "instagram.com", "facebook": "facebook.com", "whatsapp": "wa.me"}
    for link in soup.find_all("a", href=True):
        href = link["href"].lower()
        for name, domain in platforms.items():
            key = "twitter" if name == "x" else name
            if domain in href and key not in social:
                social[key] = link["href"]
    return social

def extract_services(text_lower):
    kw = {"Mutual Funds & SIP": ["mutual fund", "sip", "systematic investment", "elss"], "Equity / Shares": ["equity", "shares", "stock"],
        "Life Insurance": ["life insurance", "term insurance", "term plan", "endowment", "ulip"], "Health Insurance": ["health insurance", "mediclaim"],
        "General Insurance": ["general insurance", "motor insurance", "fire insurance", "travel insurance"], "PMS": ["portfolio management", "pms"],
        "Fixed Deposits / Bonds": ["fixed deposit", "bond", "debenture", "fixed income"], "Gold / Commodities": ["gold bond", "sovereign gold"],
        "Tax Planning": ["tax planning", "income tax", "tax saving"], "Retirement Planning": ["retirement", "pension"],
        "Financial Planning": ["financial planning", "goal based"], "NRI Services": ["nri"], "Loan / Credit": ["loan against", "loan", "credit"],
        "Estate Planning": ["estate planning", "will", "succession"]}
    return [svc for svc, words in kw.items() if any(w in text_lower for w in words)]

def run_compliance_checks(text, soup, detected_types, registrations, url, links_text):
    checks = []
    tl = text.lower()
    def add(cid, name, cat, sev, passed, detail=""):
        checks.append({"id": cid, "name": name, "category": cat, "severity": sev, "status": "pass" if passed else "fail", "detail": detail})
    add("U1", "SSL/HTTPS", "Technical", "critical", url.startswith("https"), "HTTPS" if url.startswith("https") else "No HTTPS")
    add("U2", "Viewport Meta", "Technical", "major", bool(soup.find("meta", attrs={"name": "viewport"})), "Mobile responsive")
    add("U3", "Page Title", "Technical", "minor", bool(soup.find("title") and soup.find("title").string), "Title tag")
    add("U4", "Meta Description", "Technical", "minor", bool(soup.find("meta", attrs={"name": "description"})), "Description meta")
    add("U5", "Disclaimer", "Compliance", "critical", "disclaimer" in links_text or "disclaimer" in tl, "Disclaimer reference")
    add("U6", "Privacy Policy", "Compliance", "critical", "privacy" in links_text or "privacy policy" in tl, "Privacy policy")
    add("U7", "Grievance Redressal", "Compliance", "critical", "grievance" in links_text or "grievance" in tl or "complaint" in tl, "Grievance info")
    add("U8", "Market Risk Disclaimer", "Compliance", "critical", "subject to market risk" in tl or "market risks" in tl, "Market risk disclaimer")
    add("U9", "Past Performance", "Compliance", "major", "past performance" in tl, "Past performance disclaimer")
    add("U10", "Registration in Footer", "Compliance", "critical", bool(registrations), "Registrations found" if registrations else "None detected")
    add("U11", "Contact Information", "Content", "major", bool(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)), "Contact email")
    if any(t in detected_types for t in ["MFD", "PMS", "AIF", "RIA", "SIF"]):
        add("U12", "SEBI SCORES Link", "Compliance", "major", "scores.sebi.gov.in" in tl or "scores.sebi.gov.in" in links_text or "sebi scores" in tl or "scores portal" in tl, "SEBI SCORES")
    if "Insurance" in detected_types:
        add("U13", "IRDAI IGMS Link", "Compliance", "major", "igms.irda" in tl or "igms.irda" in links_text or "irdai igms" in tl, "IRDAI IGMS")
    if "MFD" in detected_types:
        add("M1", "ARN Visible", "MFD Compliance", "critical", "ARN" in registrations, f"Found: {registrations.get('ARN', ['N/A'])[0]}")
        add("M2", "EUIN Displayed", "MFD Compliance", "critical", "EUIN" in registrations, "EUIN found" if "EUIN" in registrations else "Not detected")
        add("M3", "AMFI Tagline", "MFD Compliance", "critical", "amfi" in tl and ("registered" in tl or "distributor" in tl), "AMFI tagline")
        add("M4", "Commission Disclosure", "MFD Compliance", "major", "commission" in tl or "regular plan" in tl, "Commission disclosure")
        prohibited = ["financial adviser", "wealth adviser", "wealth manager"]
        add("M5", "No Prohibited Terms", "MFD Compliance", "critical", not any(p in tl for p in prohibited) or "RIA" in detected_types, "Prohibited terms check")
    if "Insurance" in detected_types:
        add("I1", "IRDAI License", "Insurance Compliance", "critical", "IRDAI" in registrations, "IRDAI registration")
        add("I2", "Insurer Names", "Insurance Compliance", "critical", any(w in tl for w in ["lic", "hdfc", "icici", "bajaj", "tata", "max", "sbi", "kotak"]), "Insurer names")
        add("I3", "Solicitation Disclaimer", "Insurance Compliance", "critical", "subject matter of solicitation" in tl, "Solicitation disclaimer")
    if "PMS" in detected_types:
        add("P1", "SEBI PMS Registration", "PMS Compliance", "critical", "SEBI_PMS" in registrations or "APRN" in registrations, "PMS registration")
        add("P2", "Min Investment", "PMS Compliance", "critical", "50" in text and ("lakh" in tl or "lac" in tl or "50,00,000" in text), "Min investment")
        add("P3", "Fee Structure", "PMS Compliance", "major", "fee" in tl and ("management" in tl or "performance" in tl), "Fee disclosure")
    if "AIF" in detected_types:
        add("A1", "SEBI AIF Registration", "AIF Compliance", "critical", "SEBI_AIF" in registrations, "AIF registration")
        add("A2", "Private Placement", "AIF Compliance", "critical", "private placement" in tl, "Private placement notice")
        add("A3", "Min Investment 1Cr", "AIF Compliance", "critical", "crore" in tl or "1,00,00,000" in text, "Min investment")
    if "SIF" in detected_types:
        add("S1", "ARN for SIF", "SIF Compliance", "critical", "ARN" in registrations, "ARN for SIF")
        add("S2", "NISM-XXI-A", "SIF Compliance", "critical", "nism" in tl and ("xxi" in tl or "21" in tl), "NISM certification")
    if "RIA" in detected_types:
        add("R1", "SEBI IA Registration", "RIA Compliance", "critical", "SEBI_RIA" in registrations, "IA registration")
        add("R2", "Fee Structure", "RIA Compliance", "critical", "fee" in tl and ("aua" in tl or "fixed" in tl or "advisory" in tl), "Fee disclosure")
        add("R3", "NISM Certifications", "RIA Compliance", "major", "nism" in tl, "NISM mention")
    return [c for c in checks if c is not None]

def calculate_scores(checks):
    if not checks:
        return {"overall_score": 0, "compliance_score": 0, "technical_score": 0, "content_score": 0, "total_checks": 0, "passed": 0, "failed": 0, "warnings": 0}
    weights = {"critical": 3, "major": 2, "minor": 1}
    cats = {"Technical": [], "Compliance": [], "Content": []}
    for c in checks:
        for key in cats:
            if key.lower() in c["category"].lower():
                cats[key].append(c)
                break
        else:
            cats["Compliance"].append(c)
    def score(items):
        if not items: return 100
        total = sum(weights.get(i["severity"], 1) for i in items)
        passed = sum(weights.get(i["severity"], 1) for i in items if i["status"] == "pass")
        return int((passed / total) * 100) if total else 100
    t, cn, co = score(cats["Technical"]), score(cats["Content"]), score(cats["Compliance"])
    return {"overall_score": int(t * 0.2 + cn * 0.3 + co * 0.5), "technical_score": t, "content_score": cn, "compliance_score": co,
            "total_checks": len(checks), "passed": sum(1 for c in checks if c["status"] == "pass"), "failed": sum(1 for c in checks if c["status"] == "fail"), "warnings": 0}

def perform_audit(url):
    audit_id = str(uuid.uuid4())
    try:
        if not url.startswith("http"):
            url = "https://" + url
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"}
        resp = http.get(url, headers=headers, timeout=15, allow_redirects=True, verify=False)
        soup = BeautifulSoup(resp.text, "html.parser")
        clean = clean_soup(soup)
        text = clean.get_text(separator=" ", strip=True)
        links_text = " ".join([a.get_text(strip=True).lower() + " " + (a.get("href", "").lower()) for a in soup.find_all("a", href=True)])
        registrations = detect_registrations(text)
        detected_types = detect_business_types(text, registrations)
        contact = extract_contact_info(soup, text)
        social = extract_social_links(soup)
        business_name = extract_business_name(soup, url)
        services = extract_services(text.lower())
        officers = extract_officers(text)
        title = soup.find("title").string.strip() if soup.find("title") and soup.find("title").string else ""
        compliance_checks = run_compliance_checks(text, soup, detected_types, registrations, url, links_text)
        scores = calculate_scores(compliance_checks)
        return {"audit_id": audit_id, "url": url, "status": "completed", "detected_business_types": detected_types,
            "detected_data": {"business_name": business_name, "registrations": registrations, "contact": contact, "social_links": social, "services_detected": services, "officers": officers, "page_title": title},
            "compliance_report": {**scores, "checks": compliance_checks}, "created_at": datetime.now(timezone.utc).isoformat()}
    except http.exceptions.Timeout:
        return {"audit_id": audit_id, "url": url, "status": "failed", "error": "Website took too long to respond.", "detected_business_types": [], "detected_data": {}, "compliance_report": {"overall_score": 0, "checks": []}, "created_at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        return {"audit_id": audit_id, "url": url, "status": "failed", "error": str(e), "detected_business_types": [], "detected_data": {}, "compliance_report": {"overall_score": 0, "checks": []}, "created_at": datetime.now(timezone.utc).isoformat()}
