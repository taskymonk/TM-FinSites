from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import uuid
import logging
import sys
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    import bcrypt
    import jwt
    import httpx
    from bs4 import BeautifulSoup
    from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Query, UploadFile, File
    from starlette.middleware.cors import CORSMiddleware
    from motor.motor_asyncio import AsyncIOMotorClient
    from bson import ObjectId
    from pydantic import BaseModel, Field
except ImportError as e:
    logger.error(f"Failed to import required module: {e}")
    sys.exit(1)

# ========== CONFIG ==========
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRY = timedelta(hours=24)
JWT_REFRESH_EXPIRY = timedelta(days=7)
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "finsites"
storage_key = None

# Cross-domain cookie config (for Vercel frontend + Render backend)
IS_PRODUCTION = os.environ.get("RENDER", "") == "true" or os.environ.get("PRODUCTION", "") == "true"
COOKIE_SECURE = IS_PRODUCTION
COOKIE_SAMESITE = "none" if IS_PRODUCTION else "lax"

mongo_url = os.environ.get('MONGO_URL', '')
if not mongo_url:
    logger.error("MONGO_URL environment variable is not set!")
db_name = os.environ.get('DB_NAME', 'finsites')
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000) if mongo_url else None
db = client[db_name] if client else None

app = FastAPI(title="FinSites API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========== PYDANTIC MODELS ==========
class LoginRequest(BaseModel):
    email: str
    password: str

class WizardStartRequest(BaseModel):
    plan_id: str
    contact_name: str
    contact_email: str
    contact_phone: str
    audit_id: Optional[str] = None

class StepDataRequest(BaseModel):
    data: Dict[str, Any]

class StatusUpdateRequest(BaseModel):
    status: str
    note: Optional[str] = None

class PlanUpdateRequest(BaseModel):
    name: Optional[str] = None
    price_display: Optional[str] = None
    price_amount: Optional[int] = None
    description: Optional[str] = None
    features: Optional[List[str]] = None
    delivery_days: Optional[int] = None
    support_type: Optional[str] = None
    is_contact_us: Optional[bool] = None
    is_popular: Optional[bool] = None

class AuditScanRequest(BaseModel):
    url: str

class AuditBusinessTypeUpdate(BaseModel):
    business_types: List[str]

class EnterpriseContactRequest(BaseModel):
    name: str
    email: str
    phone: str
    company: Optional[str] = None
    message: Optional[str] = None

class PaymentUpdateRequest(BaseModel):
    status: str
    amount: Optional[float] = None
    method: Optional[str] = None
    note: Optional[str] = None

# ========== AUTH HELPERS ==========
def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + JWT_ACCESS_EXPIRY, "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + JWT_REFRESH_EXPIRY, "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "user")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ========== AUDIT ENGINE ==========
REGISTRATION_PATTERNS = {
    "ARN": r"ARN[-\s]?\d{4,7}",
    "EUIN": r"E\d{6}",
    "IRDAI": r"(?:IRDAI|irda)[-\s/]?\w{4,}",
    "SEBI_PMS": r"INP\d{6,}",
    "SEBI_AIF": r"IN/AIF/[\w\-/]+",
    "SEBI_RIA": r"INA[\d/]\w{4,}",
    "APRN": r"APRN[-\s]?\d{4,}",
}

BUSINESS_TYPE_MAP = {
    "MFD": {"regs": ["ARN", "EUIN"], "keywords": ["mutual fund", "amfi", "mfd", "sip", "systematic investment", "mutual fund distributor", "arn"]},
    "Insurance": {"regs": ["IRDAI"], "keywords": ["insurance", "irdai", "life insurance", "general insurance", "health insurance", "posp", "policy"]},
    "PMS": {"regs": ["SEBI_PMS", "APRN"], "keywords": ["portfolio management", "pms", "discretionary", "non-discretionary", "apmi"]},
    "AIF": {"regs": ["SEBI_AIF"], "keywords": ["alternative investment", "aif", "category i", "category ii", "category iii", "venture capital"]},
    "SIF": {"regs": [], "keywords": ["specialised investment fund", "sif", "nism-xxi", "nism series xxi"]},
    "RIA": {"regs": ["SEBI_RIA"], "keywords": ["investment adviser", "ria", "sebi registered investment", "advisory fee", "ina/"]},
}

INDIAN_STATES = ["andhra pradesh","arunachal","assam","bihar","chhattisgarh","goa","gujarat","haryana","himachal","jharkhand","karnataka","kerala","madhya pradesh","maharashtra","manipur","meghalaya","mizoram","nagaland","odisha","punjab","rajasthan","sikkim","tamil nadu","telangana","tripura","uttar pradesh","uttarakhand","west bengal","delhi","chandigarh","puducherry","ladakh"]

def clean_soup(soup):
    """Remove script, style, svg, noscript to get clean text."""
    s = BeautifulSoup(str(soup), "lxml")
    for tag in s.find_all(["script", "style", "noscript", "svg", "link"]):
        tag.decompose()
    return s

BUSINESS_TYPE_MAP = {
    "MFD": {"regs": ["ARN", "EUIN"], "keywords": ["mutual fund", "amfi", "mfd", "sip", "systematic investment", "mutual fund distributor", "arn"]},
    "Insurance": {"regs": ["IRDAI"], "keywords": ["insurance", "irdai", "life insurance", "general insurance", "health insurance", "posp", "policy"]},
    "PMS": {"regs": ["SEBI_PMS", "APRN"], "keywords": ["portfolio management", "pms", "discretionary", "non-discretionary", "apmi"]},
    "AIF": {"regs": ["SEBI_AIF"], "keywords": ["alternative investment", "aif", "category i", "category ii", "category iii", "venture capital"]},
    "SIF": {"regs": [], "keywords": ["specialised investment fund", "sif", "nism-xxi", "nism series xxi"]},
    "RIA": {"regs": ["SEBI_RIA"], "keywords": ["investment adviser", "ria", "sebi registered investment", "advisory fee", "ina/"]},
}

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
        score = 0
        for reg in info["regs"]:
            if reg in registrations:
                score += 3
        for kw in info["keywords"]:
            if kw in text_lower:
                score += 1
        if score >= 2:
            detected.append(btype)
    return detected if detected else ["Unknown"]

def extract_business_name(soup, url):
    """Extract business name using multiple strategies."""
    # Strategy 1: og:site_name
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content", "").strip():
        return og_site["content"].strip()
    # Strategy 2: og:title (often has the brand name)
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content", "").strip():
        name = og_title["content"].strip()
        if name.lower() not in ("home", "homepage", "index", "welcome"):
            return name.split("|")[0].split("-")[0].strip()
    # Strategy 3: Footer copyright pattern
    clean = clean_soup(soup)
    clean_text = clean.get_text(separator=" ", strip=True)
    copyright_match = re.search(r'©\s*\d{4}\s+([^.|,\n]{3,50})', clean_text)
    if copyright_match:
        name = copyright_match.group(1).strip().rstrip('.')
        if name.lower() not in ("all rights reserved",):
            return name
    # Strategy 4: Title tag (but skip generic titles like "home")
    title_el = soup.find("title")
    if title_el and title_el.string:
        title = title_el.string.strip()
        if title.lower() not in ("home", "homepage", "index", "welcome", ""):
            parts = re.split(r'[|\-–—]', title)
            # Try last part first (often "Brand Name" in "Page - Brand Name")
            for part in reversed(parts):
                p = part.strip()
                if p.lower() not in ("home", "homepage", "index", "welcome", ""):
                    return p
    # Strategy 5: h1 tag
    h1 = soup.find("h1")
    if h1 and h1.get_text(strip=True):
        h1_text = h1.get_text(strip=True)
        if len(h1_text) < 80 and h1_text.lower() not in ("home", "welcome"):
            return h1_text
    # Strategy 6: Domain name
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).hostname or ""
        domain = domain.replace("www.", "").split(".")[0]
        return domain.title()
    except:
        return ""

def extract_address(clean_text):
    """Extract Indian address using structured patterns."""
    text_lower = clean_text.lower()
    for label in ["registered office", "office address", "address:", "office:"]:
        idx = text_lower.find(label)
        if idx != -1:
            snippet = clean_text[idx:idx + 300]
            pin_match = re.search(r'(.{0,150}?\d{6})', snippet)
            if pin_match:
                addr = pin_match.group(0)
                addr = re.sub(r'^(?:registered office|office address|address|office)\s*[:.]?\s*', '', addr, flags=re.IGNORECASE).strip()
                if len(addr) > 10:
                    return addr
    indian_states = ["andhra pradesh","assam","bihar","chhattisgarh","goa","gujarat","haryana","himachal","jharkhand","karnataka","kerala","madhya pradesh","maharashtra","manipur","meghalaya","mizoram","nagaland","odisha","punjab","rajasthan","sikkim","tamil nadu","telangana","tripura","uttar pradesh","uttarakhand","west bengal","delhi","chandigarh","puducherry","ladakh"]
    for m in re.finditer(r'(.{10,150}?\b(\d{6})\b)', clean_text):
        snippet = m.group(1)
        snippet_lower = snippet.lower()
        if any(state in snippet_lower for state in indian_states):
            return re.sub(r'^[\s,]+', '', snippet).strip()
    for m in re.finditer(r'(.{10,150}?\b(\d{6})\b)', clean_text):
        snippet = m.group(1)
        snippet_lower = snippet.lower()
        if any(w in snippet_lower for w in ["road", "street", "market", "nagar", "colony", "sector", "block", "floor", "tower", "building", "plot"]):
            return snippet.strip()
    return ""

def extract_contact_info(soup, text):
    info = {"phones": [], "emails": [], "address": ""}
    clean = clean_soup(soup)
    clean_text = clean.get_text(separator=" ", strip=True)
    email_matches = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', clean_text)
    info["emails"] = list(set(email_matches))[:5]
    phone_matches = re.findall(r'(?:\+91[-\s]?)?(?:\d[-\s]?){10}', clean_text)
    info["phones"] = list(set([re.sub(r'\s', '', p.strip()) for p in phone_matches]))[:5]
    info["address"] = extract_address(clean_text)
    return info

def extract_officers(clean_text):
    """Extract principal officer and compliance officer details."""
    officers = {}
    for role_label, role_key in [("principal officer", "principal_officer"), ("compliance officer", "compliance_officer"), ("grievance officer", "grievance_officer")]:
        idx = clean_text.lower().find(role_label)
        if idx != -1:
            after = clean_text[idx + len(role_label):idx + len(role_label) + 100].strip()
            after = re.sub(r'^[:\-–\s]+', '', after)
            # Capture consecutive capitalized words as the name (stop at hyphen, number, or other pattern)
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

def extract_services(text_lower):
    service_keywords = {
        "Mutual Funds & SIP": ["mutual fund", "sip", "systematic investment", "elss"],
        "Equity / Shares": ["equity", "shares", "stock"],
        "Life Insurance": ["life insurance", "term insurance", "term plan", "endowment", "ulip"],
        "Health Insurance": ["health insurance", "mediclaim", "medical insurance"],
        "General Insurance": ["general insurance", "motor insurance", "fire insurance", "travel insurance"],
        "PMS": ["portfolio management", "pms"],
        "AIF": ["alternative investment fund", "aif"],
        "Fixed Deposits / Bonds": ["fixed deposit", "fd", "tax-free bond", "bond", "debenture", "fixed income"],
        "Gold / Commodities": ["gold bond", "sovereign gold", "commodities"],
        "Tax Planning": ["tax planning", "income tax", "tax return", "tax saving"],
        "Retirement Planning": ["retirement", "pension", "superannuation"],
        "Financial Planning": ["financial planning", "goal based", "goal-based"],
        "NRI Services": ["nri"],
        "Loan / Credit": ["loan against", "loan", "credit"],
        "Estate Planning": ["estate planning", "will", "succession"],
    }
    detected = []
    for service, keywords in service_keywords.items():
        if any(kw in text_lower for kw in keywords):
            detected.append(service)
    return detected

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

def run_compliance_checks(text, soup, detected_types, registrations, url, links_text):
    checks = []
    text_lower = text.lower()

    def add(check_id, name, category, severity, passed, detail=""):
        checks.append({"id": check_id, "name": name, "category": category, "severity": severity, "status": "pass" if passed else "fail", "detail": detail})

    # Universal checks
    add("U1", "SSL/HTTPS", "Technical", "critical", url.startswith("https"), "HTTPS detected" if url.startswith("https") else "Site not using HTTPS")
    add("U2", "Viewport Meta Tag", "Technical", "major", bool(soup.find("meta", attrs={"name": "viewport"})), "Mobile responsive meta tag")
    add("U3", "Page Title", "Technical", "minor", bool(soup.find("title") and soup.find("title").string), "Title tag present")
    add("U4", "Meta Description", "Technical", "minor", bool(soup.find("meta", attrs={"name": "description"})), "Description meta tag")
    add("U5", "Disclaimer Page/Section", "Compliance", "critical", "disclaimer" in links_text or "disclaimer" in text_lower, "Disclaimer link or content found")
    add("U6", "Privacy Policy", "Compliance", "critical", "privacy" in links_text or "privacy policy" in text_lower, "Privacy policy reference found")
    add("U7", "Grievance Redressal", "Compliance", "critical", "grievance" in links_text or "grievance" in text_lower or "complaint" in text_lower, "Grievance redressal info")
    add("U8", "Market Risk Disclaimer", "Compliance", "critical", "subject to market risk" in text_lower or "market risks" in text_lower, "Standard market risk disclaimer")
    add("U9", "Past Performance Disclaimer", "Compliance", "major", "past performance" in text_lower, "Past performance disclaimer")
    add("U10", "Registration in Footer", "Compliance", "critical", bool(registrations), "Registration numbers found" if registrations else "No registration numbers detected")
    add("U11", "Contact Information", "Content", "major", bool(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)), "Contact email found")
    add("U12", "SEBI SCORES Link", "Compliance", "major", "scores.sebi.gov.in" in text_lower or "scores.sebi.gov.in" in links_text or "sebi scores" in text_lower or "scores portal" in text_lower, "SEBI SCORES link") if any(t in detected_types for t in ["MFD", "PMS", "AIF", "RIA", "SIF"]) else None
    add("U13", "IRDAI IGMS Link", "Compliance", "major", "igms.irda" in text_lower or "igms.irda" in links_text or "irdai igms" in text_lower, "IRDAI IGMS link") if "Insurance" in detected_types else None

    # MFD checks
    if "MFD" in detected_types:
        add("M1", "ARN Number Visible", "MFD Compliance", "critical", "ARN" in registrations, f"Found: {registrations.get('ARN', ['Not found'])[0]}")
        add("M2", "EUIN Displayed", "MFD Compliance", "critical", "EUIN" in registrations, "EUIN number found" if "EUIN" in registrations else "EUIN not detected")
        add("M3", "AMFI Distributor Tagline", "MFD Compliance", "critical", "amfi" in text_lower and ("registered" in text_lower or "distributor" in text_lower), "AMFI-registered tagline")
        add("M4", "Commission Disclosure", "MFD Compliance", "major", "commission" in text_lower or "regular plan" in text_lower, "Commission/regular plan disclosure")
        prohibited = ["financial adviser", "wealth adviser", "wealth manager", "financial planner", "consultant", "ifa"]
        has_prohibited = any(p in text_lower for p in prohibited)
        ria_present = "RIA" in detected_types
        add("M5", "No Prohibited Terms", "MFD Compliance", "critical", not has_prohibited or ria_present, "Uses restricted terms" if has_prohibited and not ria_present else "No prohibited terms found")

    # Insurance checks
    if "Insurance" in detected_types:
        add("I1", "IRDAI License Number", "Insurance Compliance", "critical", "IRDAI" in registrations, "IRDAI registration found")
        add("I2", "Insurer Names Stated", "Insurance Compliance", "critical", any(w in text_lower for w in ["lic", "hdfc", "icici", "bajaj", "tata", "max", "sbi", "kotak", "insurer"]), "Insurer names mentioned")
        add("I3", "Solicitation Disclaimer", "Insurance Compliance", "critical", "subject matter of solicitation" in text_lower, "Insurance solicitation disclaimer")
        add("I4", "Spurious Calls Warning", "Insurance Compliance", "major", "spurious" in text_lower or "fake" in text_lower, "Spurious calls disclaimer")

    # PMS checks
    if "PMS" in detected_types:
        add("P1", "SEBI PMS Registration", "PMS Compliance", "critical", "SEBI_PMS" in registrations, "PMS registration found")
        add("P2", "Min Investment Disclosure", "PMS Compliance", "critical", "50" in text and ("lakh" in text_lower or "lac" in text_lower or "50,00,000" in text), "Minimum investment amount")
        add("P3", "Fee Structure", "PMS Compliance", "major", "fee" in text_lower and ("management" in text_lower or "performance" in text_lower), "Fee structure disclosure")
        add("P4", "Disclosure Document Disclaimer", "PMS Compliance", "critical", "disclosure document" in text_lower, "Disclosure document reference")

    # AIF checks
    if "AIF" in detected_types:
        add("A1", "SEBI AIF Registration", "AIF Compliance", "critical", "SEBI_AIF" in registrations, "AIF registration found")
        add("A2", "Private Placement Notice", "AIF Compliance", "critical", "private placement" in text_lower, "Private placement disclaimer")
        add("A3", "Min Investment 1Cr", "AIF Compliance", "critical", "crore" in text_lower or "1,00,00,000" in text, "Minimum investment disclosure")
        add("A4", "Eligible Investors Gate", "AIF Compliance", "major", "eligible" in text_lower or "sophisticated" in text_lower or "accredited" in text_lower, "Investor eligibility notice")

    # SIF checks
    if "SIF" in detected_types:
        add("S1", "ARN for SIF", "SIF Compliance", "critical", "ARN" in registrations, "ARN number for SIF distribution")
        add("S2", "NISM-XXI-A Certification", "SIF Compliance", "critical", "nism" in text_lower and ("xxi" in text_lower or "21" in text_lower), "NISM certification reference")
        add("S3", "SIF Min Investment 10L", "SIF Compliance", "major", "10" in text and ("lakh" in text_lower or "10,00,000" in text), "SIF minimum investment")

    # RIA checks
    if "RIA" in detected_types:
        add("R1", "SEBI IA Registration", "RIA Compliance", "critical", "SEBI_RIA" in registrations, "IA registration found")
        add("R2", "Fee Structure Disclosed", "RIA Compliance", "critical", "fee" in text_lower and ("aua" in text_lower or "fixed" in text_lower or "advisory" in text_lower), "Advisory fee structure")
        add("R3", "NISM Certifications", "RIA Compliance", "major", "nism" in text_lower, "NISM certification mentioned")
        add("R4", "AI Tools Disclosure", "RIA Compliance", "major", "artificial intelligence" in text_lower or "ai tool" in text_lower or "ai-based" in text_lower, "AI disclosure (if applicable)")

    checks = [c for c in checks if c is not None]
    return checks

def calculate_scores(checks):
    if not checks:
        return {"overall_score": 0, "compliance_score": 0, "technical_score": 0, "content_score": 0, "total_checks": 0, "passed": 0, "failed": 0, "warnings": 0}
    weights = {"critical": 3, "major": 2, "minor": 1}
    cats = {"Technical": [], "Compliance": [], "Content": []}
    for c in checks:
        cat = c["category"]
        for key in cats:
            if key.lower() in cat.lower():
                cats[key].append(c)
                break
        else:
            cats["Compliance"].append(c)

    def cat_score(items):
        if not items:
            return 100
        total = sum(weights.get(i["severity"], 1) for i in items)
        passed = sum(weights.get(i["severity"], 1) for i in items if i["status"] == "pass")
        return int((passed / total) * 100) if total > 0 else 100

    tech = cat_score(cats["Technical"])
    content = cat_score(cats["Content"])
    compliance = cat_score(cats["Compliance"])
    overall = int(tech * 0.2 + content * 0.3 + compliance * 0.5)

    return {
        "overall_score": overall,
        "technical_score": tech,
        "content_score": content,
        "compliance_score": compliance,
        "total_checks": len(checks),
        "passed": sum(1 for c in checks if c["status"] == "pass"),
        "failed": sum(1 for c in checks if c["status"] == "fail"),
        "warnings": sum(1 for c in checks if c["status"] == "warning"),
    }

async def perform_audit(url: str) -> dict:
    audit_id = str(uuid.uuid4())
    try:
        if not url.startswith("http"):
            url = "https://" + url
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, verify=False) as hc:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"}
            resp = await hc.get(url, headers=headers)
        soup = BeautifulSoup(resp.text, "lxml")
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
        checks = run_compliance_checks(text, soup, detected_types, registrations, url, links_text)
        scores = calculate_scores(checks)

        return {
            "audit_id": audit_id, "url": url, "status": "completed",
            "detected_business_types": detected_types,
            "detected_data": {
                "business_name": business_name,
                "registrations": registrations,
                "contact": contact,
                "social_links": social,
                "services_detected": services,
                "officers": officers,
                "page_title": title,
            },
            "compliance_report": {**scores, "checks": checks},
            "raw_scan": {"text": text[:50000], "links_text": links_text[:20000], "url": url},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    except httpx.TimeoutException:
        return {"audit_id": audit_id, "url": url, "status": "failed", "error": "Website took too long to respond. Please try again.", "detected_business_types": [], "detected_data": {}, "compliance_report": {"overall_score": 0, "checks": []}, "created_at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.error(f"Audit scan error: {e}")
        return {"audit_id": audit_id, "url": url, "status": "failed", "error": f"Could not scan website: {str(e)}", "detected_business_types": [], "detected_data": {}, "compliance_report": {"overall_score": 0, "checks": []}, "created_at": datetime.now(timezone.utc).isoformat()}

# ========== AUTH ROUTES ==========
@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=604800, path="/")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}})
    return {"id": user_id, "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "user")}

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

# ========== AUDIT ROUTES ==========
@api_router.post("/audit/scan")
async def scan_website(req: AuditScanRequest):
    result = await perform_audit(req.url)
    await db.audits.insert_one({**result})
    return result

@api_router.get("/audit/{audit_id}")
async def get_audit(audit_id: str):
    audit = await db.audits.find_one({"audit_id": audit_id}, {"_id": 0, "raw_scan": 0})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit

@api_router.put("/audit/{audit_id}/business-type")
async def update_audit_business_type(audit_id: str, req: AuditBusinessTypeUpdate):
    audit = await db.audits.find_one({"audit_id": audit_id}, {"_id": 0})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    # Re-run compliance checks with new business types using stored raw data
    raw = audit.get("raw_scan", {})
    text = raw.get("text", "")
    links_text = raw.get("links_text", "")
    url = raw.get("url", audit.get("url", ""))
    registrations = audit.get("detected_data", {}).get("registrations", {})
    if text:
        soup = BeautifulSoup(text, "lxml") if "<" in text else None
        checks = run_compliance_checks(text, soup or BeautifulSoup("", "lxml"), req.business_types, registrations, url, links_text)
        scores = calculate_scores(checks)
        report = {**scores, "checks": checks}
        await db.audits.update_one({"audit_id": audit_id}, {"$set": {"detected_business_types": req.business_types, "compliance_report": report}})
        audit["detected_business_types"] = req.business_types
        audit["compliance_report"] = report
    else:
        await db.audits.update_one({"audit_id": audit_id}, {"$set": {"detected_business_types": req.business_types}})
        audit["detected_business_types"] = req.business_types
    audit.pop("raw_scan", None)
    return audit

# ========== WIZARD ROUTES ==========
@api_router.post("/wizard/start")
async def start_wizard(req: WizardStartRequest):
    session_id = str(uuid.uuid4())
    prefilled_data = {}
    if req.audit_id:
        audit = await db.audits.find_one({"audit_id": req.audit_id}, {"_id": 0})
        if audit and audit.get("detected_data"):
            d = audit["detected_data"]
            prefilled_data = {
                "step_1": {"business_types": audit.get("detected_business_types", [])},
                "step_2": {"group_a": {"business_name": d.get("business_name", ""), "email": d.get("contact", {}).get("emails", [""])[0] if d.get("contact", {}).get("emails") else "", "phone": d.get("contact", {}).get("phones", [""])[0] if d.get("contact", {}).get("phones") else "", "address": d.get("contact", {}).get("address", ""), "social_links": d.get("social_links", {})}},
            }
    session = {
        "session_id": session_id, "audit_id": req.audit_id, "plan_id": req.plan_id,
        "contact": {"name": req.contact_name, "email": req.contact_email, "phone": req.contact_phone},
        "current_step": 1, "status": "in_progress", "business_types": prefilled_data.get("step_1", {}).get("business_types", []),
        "data": prefilled_data, "prefilled_from_audit": bool(req.audit_id),
        "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.wizard_sessions.insert_one({**session})
    return session

@api_router.get("/wizard/{session_id}")
async def get_wizard(session_id: str):
    session = await db.wizard_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@api_router.put("/wizard/{session_id}/step/{step_num}")
async def save_wizard_step(session_id: str, step_num: int, req: StepDataRequest):
    session = await db.wizard_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    update = {
        f"data.step_{step_num}": req.data,
        "current_step": max(step_num, session.get("current_step", 1)),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if step_num == 1 and "business_types" in req.data:
        update["business_types"] = req.data["business_types"]
    await db.wizard_sessions.update_one({"session_id": session_id}, {"$set": update})
    updated = await db.wizard_sessions.find_one({"session_id": session_id}, {"_id": 0})
    return updated

@api_router.post("/wizard/{session_id}/submit")
async def submit_wizard(session_id: str):
    session = await db.wizard_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Session already submitted")

    ref_count = await db.submissions.count_documents({})
    ref_number = f"FS-{datetime.now(timezone.utc).year}-{str(ref_count + 1).zfill(5)}"
    submission_id = str(uuid.uuid4())
    contact = session.get("contact", {})
    step2 = session.get("data", {}).get("step_2", {})
    group_a = step2.get("group_a", {})

    submission = {
        "submission_id": submission_id, "session_id": session_id, "reference_number": ref_number,
        "audit_id": session.get("audit_id"),
        "client_name": group_a.get("business_name", contact.get("name", "")),
        "client_email": group_a.get("email", contact.get("email", "")),
        "client_phone": contact.get("phone", ""),
        "business_types": session.get("business_types", []),
        "plan": {"tier": session.get("plan_id", "starter")},
        "status": "submitted",
        "status_history": [{"status": "submitted", "at": datetime.now(timezone.utc).isoformat(), "by": "system", "note": "Onboarding wizard completed"}],
        "data": session.get("data", {}),
        "payment": {"status": "pending", "amount": None, "received_at": None, "method": None, "note": None},
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.submissions.insert_one({**submission})
    await db.wizard_sessions.update_one({"session_id": session_id}, {"$set": {"status": "completed"}})
    return {"submission_id": submission_id, "reference_number": ref_number}

# ========== PLAN ROUTES (PUBLIC) ==========
@api_router.get("/plans")
async def get_plans():
    plans = await db.plans.find({}, {"_id": 0}).sort("sort_order", 1).to_list(10)
    return plans

# ========== STATUS ROUTES (PUBLIC) ==========
@api_router.get("/status/{submission_id}")
async def get_submission_status(submission_id: str):
    sub = await db.submissions.find_one({"submission_id": submission_id}, {"_id": 0, "data": 0})
    if not sub:
        sub = await db.submissions.find_one({"reference_number": submission_id}, {"_id": 0, "data": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {
        "submission_id": sub["submission_id"], "reference_number": sub.get("reference_number", ""),
        "client_name": sub.get("client_name", ""), "status": sub.get("status", ""),
        "plan": sub.get("plan", {}), "business_types": sub.get("business_types", []),
        "status_history": sub.get("status_history", []),
        "payment": sub.get("payment", {}),
        "submitted_at": sub.get("submitted_at", ""),
    }

# ========== ENTERPRISE CONTACT ==========
@api_router.post("/contact/enterprise")
async def enterprise_contact(req: EnterpriseContactRequest):
    contact_id = str(uuid.uuid4())
    doc = {
        "contact_id": contact_id, "name": req.name, "email": req.email, "phone": req.phone,
        "company": req.company, "message": req.message, "plan_interest": "enterprise",
        "status": "new", "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.enterprise_contacts.insert_one(doc)
    return {"contact_id": contact_id, "message": "Thank you! Our team will contact you within 24 hours."}

# ========== ADMIN ROUTES ==========
@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    total = await db.submissions.count_documents({})
    by_status = {}
    for s in ["submitted", "under_review", "payment_pending", "payment_received", "in_production", "delivered", "live", "rejected", "abandoned"]:
        by_status[s] = await db.submissions.count_documents({"status": s})
    by_type = {}
    pipeline = [{"$unwind": "$business_types"}, {"$group": {"_id": "$business_types", "count": {"$sum": 1}}}]
    async for doc in db.submissions.aggregate(pipeline):
        by_type[doc["_id"]] = doc["count"]
    total_audits = await db.audits.count_documents({})
    enterprise_leads = await db.enterprise_contacts.count_documents({})
    return {"total_submissions": total, "by_status": by_status, "by_type": by_type, "total_audits": total_audits, "enterprise_leads": enterprise_leads}

@api_router.get("/admin/submissions")
async def list_submissions(request: Request, status: Optional[str] = None, business_type: Optional[str] = None, search: Optional[str] = None, page: int = 1, limit: int = 20):
    await require_admin(request)
    query = {}
    if status:
        query["status"] = status
    if business_type:
        query["business_types"] = business_type
    if search:
        query["$or"] = [{"client_name": {"$regex": search, "$options": "i"}}, {"client_email": {"$regex": search, "$options": "i"}}, {"reference_number": {"$regex": search, "$options": "i"}}]
    total = await db.submissions.count_documents(query)
    subs = await db.submissions.find(query, {"_id": 0, "data": 0}).sort("submitted_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"submissions": subs, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/admin/submissions/{submission_id}")
async def get_submission_detail(submission_id: str, request: Request):
    await require_admin(request)
    sub = await db.submissions.find_one({"submission_id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub

@api_router.put("/admin/submissions/{submission_id}/status")
async def update_submission_status(submission_id: str, req: StatusUpdateRequest, request: Request):
    admin = await require_admin(request)
    sub = await db.submissions.find_one({"submission_id": submission_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    history_entry = {"status": req.status, "at": datetime.now(timezone.utc).isoformat(), "by": admin["email"], "note": req.note or ""}
    await db.submissions.update_one({"submission_id": submission_id}, {"$set": {"status": req.status, "updated_at": datetime.now(timezone.utc).isoformat()}, "$push": {"status_history": history_entry}})
    return {"message": "Status updated", "status": req.status}

@api_router.put("/admin/submissions/{submission_id}/payment")
async def update_payment(submission_id: str, req: PaymentUpdateRequest, request: Request):
    admin = await require_admin(request)
    sub = await db.submissions.find_one({"submission_id": submission_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    payment = {"status": req.status, "amount": req.amount, "method": req.method, "note": req.note, "received_at": datetime.now(timezone.utc).isoformat() if req.status == "received" else None}
    update_set = {"payment": payment, "updated_at": datetime.now(timezone.utc).isoformat()}
    if req.status == "received":
        update_set["status"] = "payment_received"
    await db.submissions.update_one({"submission_id": submission_id}, {"$set": update_set, "$push": {"status_history": {"status": f"payment_{req.status}", "at": datetime.now(timezone.utc).isoformat(), "by": admin["email"], "note": req.note or ""}}})
    return {"message": "Payment updated"}

@api_router.get("/admin/audits")
async def list_audits(request: Request, page: int = 1, limit: int = 20):
    await require_admin(request)
    total = await db.audits.count_documents({})
    audits = await db.audits.find({}, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"audits": audits, "total": total, "page": page}

@api_router.put("/admin/plans/{plan_id}")
async def update_plan(plan_id: str, req: PlanUpdateRequest, request: Request):
    await require_admin(request)
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.plans.update_one({"plan_id": plan_id}, {"$set": update})
    plan = await db.plans.find_one({"plan_id": plan_id}, {"_id": 0})
    return plan

@api_router.get("/admin/enterprise-contacts")
async def list_enterprise_contacts(request: Request):
    await require_admin(request)
    contacts = await db.enterprise_contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return contacts

# ========== OBJECT STORAGE ==========
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    if not emergent_key:
        logger.warning("EMERGENT_LLM_KEY not set, file uploads disabled")
        return None
    import requests as req_lib
    resp = req_lib.post(f"{STORAGE_URL}/init", json={"emergent_key": emergent_key}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    import requests as req_lib
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = req_lib.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    import requests as req_lib
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = req_lib.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/svg+xml", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@api_router.post("/upload/logo")
async def upload_logo(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: JPEG, PNG, SVG, WebP, GIF")
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/logos/{file_id}.{ext}"
    result = put_object(path, data, file.content_type or "image/png")
    doc = {
        "file_id": file_id, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": file.content_type, "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(doc)
    return {"file_id": file_id, "path": result["path"], "filename": file.filename, "size": len(data), "url": f"/api/files/{result['path']}"}

@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    file_data, content_type = get_object(path)
    return Response(content=file_data, media_type=record.get("content_type", content_type), headers={"Cache-Control": "public, max-age=86400"})

# ========== HEALTH CHECK ==========
@api_router.get("/health")
async def health_check():
    status = {"api": "ok", "database": "unknown"}
    try:
        if db is not None:
            await db.command("ping")
            status["database"] = "ok"
        else:
            status["database"] = "not configured"
    except Exception as e:
        status["database"] = f"error: {str(e)}"
    return status

# ========== INCLUDE ROUTER ==========
app.include_router(api_router)

# ========== CORS ==========
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
cors_origins = [frontend_url, "http://localhost:3000"]
extra_origins = os.environ.get("CORS_ORIGINS", "")
if extra_origins and extra_origins != "*":
    cors_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== STARTUP ==========
DEFAULT_PLANS = [
    {"plan_id": "starter", "name": "Starter", "price_display": "Starting at INR 9,999", "price_amount": 9999, "description": "Perfect for individual practitioners with a single business type", "business_types_limit": 1, "features": ["Single business type website", "5 core compliance pages", "Full regulatory compliance", "Standard design template", "SSL certificate included", "Mobile responsive design", "Basic SEO optimization", "Email support", "7 working days delivery"], "delivery_days": 7, "support_type": "Email", "is_contact_us": False, "is_popular": False, "sort_order": 1},
    {"plan_id": "professional", "name": "Professional", "price_display": "Starting at INR 24,999", "price_amount": 24999, "description": "Ideal for multi-service firms needing comprehensive compliance", "business_types_limit": 3, "features": ["Up to 3 business types", "8+ pages with blog & calculators", "Full compliance + combination rules", "Custom design with brand colors", "SSL certificate included", "Advanced SEO optimization", "Priority email + call support", "5 working days delivery"], "delivery_days": 5, "support_type": "Priority", "is_contact_us": False, "is_popular": True, "sort_order": 2},
    {"plan_id": "enterprise", "name": "Enterprise", "price_display": "Custom Quote", "price_amount": 0, "description": "For large firms & institutions needing bespoke solutions", "business_types_limit": -1, "features": ["Unlimited business type combinations", "Unlimited pages", "Full compliance + ongoing monitoring", "Fully bespoke design", "White-label option available", "API access", "Dedicated account manager", "3 working days delivery"], "delivery_days": 3, "support_type": "Dedicated", "is_contact_us": True, "is_popular": False, "sort_order": 3},
]

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@finsites.in")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password), "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")

async def seed_plans():
    for plan in DEFAULT_PLANS:
        existing = await db.plans.find_one({"plan_id": plan["plan_id"]})
        if not existing:
            await db.plans.insert_one(plan)
            logger.info(f"Plan seeded: {plan['plan_id']}")

async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.audits.create_index("audit_id", unique=True)
    await db.wizard_sessions.create_index("session_id", unique=True)
    await db.submissions.create_index("submission_id", unique=True)
    await db.submissions.create_index("reference_number")
    await db.plans.create_index("plan_id", unique=True)
    await db.enterprise_contacts.create_index("contact_id")

@app.on_event("startup")
async def startup():
    try:
        if db is not None:
            await create_indexes()
            await seed_admin()
            await seed_plans()
            logger.info("Database initialized successfully")
        else:
            logger.error("Database not connected - check MONGO_URL")
    except Exception as e:
        logger.error(f"Database startup error: {e}")
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Storage init deferred: {e}")
    try:
        cred_path = Path("/app/memory/test_credentials.md")
        cred_path.parent.mkdir(parents=True, exist_ok=True)
        cred_path.write_text(f"# Test Credentials\n\n## Admin\n- Email: {os.environ.get('ADMIN_EMAIL', 'admin@finsites.in')}\n- Password: {os.environ.get('ADMIN_PASSWORD', 'admin123')}\n")
    except Exception:
        pass
    logger.info("FinSites API started")

@app.on_event("shutdown")
async def shutdown():
    if client:
        client.close()
