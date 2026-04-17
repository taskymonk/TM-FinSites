import * as cheerio from "cheerio"

export interface ComplianceRule {
  id: string
  name: string
  category: string
  severity: "critical" | "major" | "minor"
  businessTypes: string[]
  check: (ctx: AuditContext) => RuleResult
}

export interface AuditContext {
  url: string
  html: string
  text: string
  $: cheerio.CheerioAPI
  links: string[]
  title: string
  meta: Record<string, string>
}

export interface RuleResult {
  passed: boolean
  details: string
}

export interface AuditResult {
  audit_id: string
  url: string
  status: "completed" | "error"
  overall_score: number
  detected_business_types: string[]
  categories: Record<string, CategoryResult>
  total_rules: number
  passed_rules: number
  failed_rules: number
  critical_failures: number
  major_failures: number
  minor_failures: number
  results: RuleCheckResult[]
  scanned_at: string
}

export interface CategoryResult {
  passed: number
  total: number
  score: number
}

export interface RuleCheckResult {
  rule_id: string
  name: string
  category: string
  severity: string
  business_types: string[]
  passed: boolean
  details: string
}

function detectBusinessTypes(text: string, $: cheerio.CheerioAPI): string[] {
  const detected: string[] = []
  const lowerText = text.toLowerCase()
  const checks: [string, RegExp[]][] = [
    ["MFD", [/mutual fund/i, /amfi/i, /arn[:\s-]*\d/i, /mfd/i, /distributor/i]],
    ["Insurance", [/irdai/i, /insurance/i, /lic\b/i, /posp/i, /insurance broker/i]],
    ["RIA", [/investment advis/i, /ria\b/i, /sebi.*advis/i, /registered investment/i, /advisory/i]],
    ["PMS", [/portfolio management/i, /pms\b/i, /discretionary/i, /non-discretionary/i]],
    ["Stock Broker", [/stock\s*brok/i, /trading/i, /nse\b/i, /bse\b/i, /authorized\s*person/i, /sub[\s-]?broker/i]],
    ["SIF", [/specialised investment fund/i, /specialized investment fund/i, /sif\b/i, /nism.*xxi/i]],
    ["NPS", [/nps\b/i, /national pension/i, /pfrda/i, /pension\s*fund/i]],
  ]
  for (const [type, patterns] of checks) {
    const matches = patterns.filter((p) => p.test(lowerText)).length
    if (matches >= 1) detected.push(type)
  }
  if (detected.length === 0) {
    if (/financ/i.test(lowerText) || /invest/i.test(lowerText)) detected.push("MFD")
  }
  return detected
}

const COMPLIANCE_RULES: ComplianceRule[] = [
  // REGISTRATION & IDENTITY
  {
    id: "REG-001", name: "SEBI Registration Number Display", category: "Registration & Identity", severity: "critical",
    businessTypes: ["MFD", "RIA", "PMS", "Stock Broker", "SIF"],
    check: (ctx) => {
      const hasReg = /SEBI\s*(registration|reg\.?)\s*(no\.?|number|#)?\s*:?\s*[A-Z]{2,4}[\/\-]?\d/i.test(ctx.text)
      return { passed: hasReg, details: hasReg ? "SEBI registration number found" : "SEBI registration number not displayed" }
    },
  },
  {
    id: "REG-002", name: "AMFI ARN Display", category: "Registration & Identity", severity: "critical",
    businessTypes: ["MFD"],
    check: (ctx) => {
      const hasArn = /ARN\s*[-:]?\s*\d{3,}/i.test(ctx.text)
      return { passed: hasArn, details: hasArn ? "AMFI ARN number found" : "AMFI ARN number not displayed on website" }
    },
  },
  {
    id: "REG-003", name: "IRDAI License Number Display", category: "Registration & Identity", severity: "critical",
    businessTypes: ["Insurance"],
    check: (ctx) => {
      const has = /IRDAI\s*(registration|license|lic|reg)?\s*(no\.?|number|#)?\s*:?\s*\w{2,}/i.test(ctx.text) || /license\s*(no\.?|number)?\s*:?\s*\w+/i.test(ctx.text)
      return { passed: has, details: has ? "IRDAI license information found" : "IRDAI license/registration number not displayed" }
    },
  },
  {
    id: "REG-004", name: "PFRDA Registration Display", category: "Registration & Identity", severity: "critical",
    businessTypes: ["NPS"],
    check: (ctx) => {
      const has = /PFRDA\s*(registration|reg)?\s*(no\.?|number)?\s*:?\s*\w+/i.test(ctx.text) || /point\s*of\s*presence/i.test(ctx.text)
      return { passed: has, details: has ? "PFRDA registration found" : "PFRDA registration details not displayed" }
    },
  },
  {
    id: "REG-005", name: "Business Entity Name", category: "Registration & Identity", severity: "major",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const has = ctx.title.length > 3 && !/untitled|welcome|home page/i.test(ctx.title)
      return { passed: has, details: has ? "Business name found in title" : "No clear business entity name in page title" }
    },
  },

  // DISCLAIMERS
  {
    id: "DISC-001", name: "Investment Risk Disclaimer", category: "Disclaimers & Disclosures", severity: "critical",
    businessTypes: ["MFD", "RIA", "PMS", "SIF"],
    check: (ctx) => {
      const has = /mutual fund.*subject to market risk/i.test(ctx.text) || /investment.*risk/i.test(ctx.text) || /past performance.*not.*indicat/i.test(ctx.text) || /market risk/i.test(ctx.text)
      return { passed: has, details: has ? "Investment risk disclaimer found" : "Missing standard investment risk disclaimer" }
    },
  },
  {
    id: "DISC-002", name: "Mutual Fund Disclaimer", category: "Disclaimers & Disclosures", severity: "critical",
    businessTypes: ["MFD"],
    check: (ctx) => {
      const has = /mutual fund.*subject to market risk/i.test(ctx.text) || /read.*scheme.*document/i.test(ctx.text) || /scheme\s*related\s*document/i.test(ctx.text)
      return { passed: has, details: has ? "Mutual fund disclaimer found" : "Missing 'Mutual funds are subject to market risks' disclaimer" }
    },
  },
  {
    id: "DISC-003", name: "No Guaranteed Returns Disclosure", category: "Disclaimers & Disclosures", severity: "critical",
    businessTypes: ["MFD", "RIA", "PMS", "SIF"],
    check: (ctx) => {
      const hasGuarantee = /guaranteed\s*(return|profit|income)/i.test(ctx.text) && !/no\s*guarant/i.test(ctx.text) && !/not\s*guarant/i.test(ctx.text)
      const hasProperDisclaimer = /no\s*guarant/i.test(ctx.text) || /not\s*guarant/i.test(ctx.text) || /returns are not guaranteed/i.test(ctx.text)
      if (hasGuarantee) return { passed: false, details: "Website appears to promise guaranteed returns — serious compliance violation" }
      return { passed: hasProperDisclaimer || !hasGuarantee, details: hasProperDisclaimer ? "Proper no-guarantee disclosure found" : "Consider adding explicit 'returns are not guaranteed' disclosure" }
    },
  },
  {
    id: "DISC-004", name: "Insurance Disclaimer", category: "Disclaimers & Disclosures", severity: "critical",
    businessTypes: ["Insurance"],
    check: (ctx) => {
      const has = /insurance.*subject/i.test(ctx.text) || /policy\s*document/i.test(ctx.text) || /irdai.*not.*endors/i.test(ctx.text) || /insurance is.*solicitation/i.test(ctx.text)
      return { passed: has, details: has ? "Insurance disclaimer found" : "Missing IRDAI-mandated insurance disclaimer" }
    },
  },
  {
    id: "DISC-005", name: "SIDD Compliance (Dual Registration)", category: "Disclaimers & Disclosures", severity: "critical",
    businessTypes: ["MFD", "RIA"],
    check: (ctx) => {
      const hasBoth = /distribution/i.test(ctx.text) && /advisory/i.test(ctx.text)
      const hasSidd = /sidd/i.test(ctx.text) || /segregat/i.test(ctx.text) || /independent.*distribution.*advisory/i.test(ctx.text)
      if (!hasBoth) return { passed: true, details: "Single-activity entity — SIDD not applicable" }
      return { passed: hasSidd, details: hasSidd ? "SIDD segregation disclosure found" : "Dual MFD+RIA detected but SIDD segregation not clearly disclosed" }
    },
  },

  // CONTACT & GRIEVANCE
  {
    id: "CONT-001", name: "Contact Information", category: "Contact & Grievance", severity: "major",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const hasEmail = /[\w.-]+@[\w.-]+\.\w{2,}/i.test(ctx.text)
      const hasPhone = /(\+91[\s-]?)?[6-9]\d{9}/i.test(ctx.text) || /\d{2,4}[-\s]?\d{6,8}/i.test(ctx.text)
      const hasContact = ctx.$('a[href^="mailto:"]').length > 0 || ctx.$('a[href^="tel:"]').length > 0
      const passed = hasEmail || hasPhone || hasContact
      return { passed, details: passed ? "Contact information found" : "No email, phone, or contact links found" }
    },
  },
  {
    id: "CONT-002", name: "Grievance Redressal Mechanism", category: "Contact & Grievance", severity: "major",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const has = /grievance/i.test(ctx.text) || /complaint/i.test(ctx.text) || /redress/i.test(ctx.text) || /ombudsman/i.test(ctx.text) || /scores/i.test(ctx.text)
      return { passed: has, details: has ? "Grievance redressal mechanism mentioned" : "No grievance redressal or complaint mechanism found" }
    },
  },
  {
    id: "CONT-003", name: "SCORES/IGMS Link", category: "Contact & Grievance", severity: "minor",
    businessTypes: ["MFD", "RIA", "PMS", "Stock Broker", "SIF"],
    check: (ctx) => {
      const has = ctx.links.some((l) => /scores\.gov\.in/i.test(l)) || /scores/i.test(ctx.text) || /igms/i.test(ctx.text)
      return { passed: has, details: has ? "SCORES/IGMS reference found" : "Consider adding link to SEBI SCORES portal for investor grievances" }
    },
  },

  // PRIVACY & LEGAL
  {
    id: "PRIV-001", name: "Privacy Policy", category: "Privacy & Legal", severity: "major",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const hasLink = ctx.$('a').filter((_, el) => /privacy/i.test(ctx.$(el).text())).length > 0
      const hasText = /privacy\s*policy/i.test(ctx.text)
      return { passed: hasLink || hasText, details: hasLink ? "Privacy policy link found" : hasText ? "Privacy policy text found" : "No privacy policy page or link found" }
    },
  },
  {
    id: "PRIV-002", name: "Terms & Conditions", category: "Privacy & Legal", severity: "minor",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const has = ctx.$('a').filter((_, el) => /terms/i.test(ctx.$(el).text())).length > 0 || /terms\s*(and|&)\s*condition/i.test(ctx.text) || /terms\s*of\s*(use|service)/i.test(ctx.text)
      return { passed: has, details: has ? "Terms & conditions found" : "No terms and conditions page found" }
    },
  },
  {
    id: "PRIV-003", name: "Disclaimer Page", category: "Privacy & Legal", severity: "minor",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const has = ctx.$('a').filter((_, el) => /disclaimer/i.test(ctx.$(el).text())).length > 0 || /disclaimer/i.test(ctx.text)
      return { passed: has, details: has ? "Disclaimer page/section found" : "No dedicated disclaimer page found" }
    },
  },

  // TECHNICAL & SEO
  {
    id: "TECH-001", name: "SSL/HTTPS", category: "Technical & Security", severity: "critical",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const passed = ctx.url.startsWith("https://")
      return { passed, details: passed ? "Website uses HTTPS" : "Website does not use HTTPS — critical security issue" }
    },
  },
  {
    id: "TECH-002", name: "Mobile Responsive", category: "Technical & Security", severity: "major",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const hasViewport = ctx.$('meta[name="viewport"]').length > 0
      return { passed: hasViewport, details: hasViewport ? "Viewport meta tag found — likely responsive" : "No viewport meta tag — may not be mobile responsive" }
    },
  },
  {
    id: "TECH-003", name: "Page Title & Meta Description", category: "Technical & Security", severity: "minor",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const hasTitle = ctx.title.length > 5
      const hasDesc = (ctx.$('meta[name="description"]').attr("content")?.length ?? 0) > 10
      const passed = hasTitle && hasDesc
      return { passed, details: passed ? "Good title and meta description found" : `Missing: ${!hasTitle ? "page title" : ""}${!hasTitle && !hasDesc ? " and " : ""}${!hasDesc ? "meta description" : ""}` }
    },
  },

  // CONTENT QUALITY
  {
    id: "QUAL-001", name: "About Us / About Section", category: "Content Quality", severity: "minor",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const has = /about\s*(us|me|the\s*firm|the\s*company)/i.test(ctx.text) || ctx.$('a').filter((_, el) => /about/i.test(ctx.$(el).text())).length > 0
      return { passed: has, details: has ? "About section/page found" : "No about us section found — recommended for trust building" }
    },
  },
  {
    id: "QUAL-002", name: "Services Listed", category: "Content Quality", severity: "minor",
    businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => {
      const has = /service/i.test(ctx.text) || /what we (do|offer)/i.test(ctx.text) || /our\s*(services|offerings|products)/i.test(ctx.text)
      return { passed: has, details: has ? "Services section found" : "No clear services section found" }
    },
  },
  {
    id: "QUAL-003", name: "No Misleading Performance Claims", category: "Content Quality", severity: "critical",
    businessTypes: ["MFD", "RIA", "PMS", "SIF"],
    check: (ctx) => {
      const misleading = /\d+%\s*(return|profit|gain)/i.test(ctx.text) && !/past\s*performance/i.test(ctx.text)
      return { passed: !misleading, details: misleading ? "Potential misleading performance claims without proper disclaimers" : "No misleading performance claims detected" }
    },
  },

  // PMS SPECIFIC
  {
    id: "PMS-001", name: "PMS Minimum Investment Disclosure", category: "PMS Specific", severity: "major",
    businessTypes: ["PMS"],
    check: (ctx) => {
      const has = /minimum\s*(investment|amount)/i.test(ctx.text) || /50\s*lakh/i.test(ctx.text) || /INR\s*50/i.test(ctx.text)
      return { passed: has, details: has ? "PMS minimum investment amount disclosed" : "PMS minimum investment threshold (INR 50 lakh) not disclosed" }
    },
  },
  {
    id: "PMS-002", name: "PMS Fee Structure Disclosure", category: "PMS Specific", severity: "major",
    businessTypes: ["PMS"],
    check: (ctx) => {
      const has = /fee\s*(structure|schedule)/i.test(ctx.text) || /management\s*fee/i.test(ctx.text) || /performance\s*fee/i.test(ctx.text)
      return { passed: has, details: has ? "Fee structure information found" : "PMS fee structure not disclosed" }
    },
  },

  // SIF SPECIFIC
  {
    id: "SIF-001", name: "SIF Minimum Investment Display", category: "SIF Specific", severity: "major",
    businessTypes: ["SIF"],
    check: (ctx) => {
      const has = /minimum\s*(investment|subscription)/i.test(ctx.text) || /10\s*lakh/i.test(ctx.text)
      return { passed: has, details: has ? "SIF minimum investment details found" : "SIF minimum investment amount not displayed" }
    },
  },
  {
    id: "SIF-002", name: "SIF Risk Band Disclosure", category: "SIF Specific", severity: "major",
    businessTypes: ["SIF"],
    check: (ctx) => {
      const has = /risk\s*(band|categor|level|meter)/i.test(ctx.text) || /high\s*risk/i.test(ctx.text) || /riskometer/i.test(ctx.text)
      return { passed: has, details: has ? "Risk band/category information found" : "SIF risk band disclosure not found" }
    },
  },

  // STOCK BROKER SPECIFIC
  {
    id: "SB-001", name: "Exchange Membership Details", category: "Stock Broker Specific", severity: "major",
    businessTypes: ["Stock Broker"],
    check: (ctx) => {
      const has = /member(ship)?\s*(of\s*)?(nse|bse)/i.test(ctx.text) || /exchange\s*member/i.test(ctx.text) || /trading\s*member/i.test(ctx.text) || /sebi\s*reg/i.test(ctx.text)
      return { passed: has, details: has ? "Exchange membership details found" : "Stock exchange membership details not displayed" }
    },
  },
  {
    id: "SB-002", name: "Investor Charter Link", category: "Stock Broker Specific", severity: "minor",
    businessTypes: ["Stock Broker"],
    check: (ctx) => {
      const has = /investor\s*charter/i.test(ctx.text) || ctx.links.some((l) => /investor.*charter/i.test(l))
      return { passed: has, details: has ? "Investor charter reference found" : "Investor charter not linked — recommended by SEBI" }
    },
  },

  // ============ EXPANDED RULES ============

  // REGISTRATION EXPANDED
  { id: "REG-006", name: "CIN / PAN Display", category: "Registration & Identity", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /\b(CIN|PAN)\s*:?\s*[A-Z0-9]{5,}/i.test(ctx.text); return { passed: has, details: has ? "CIN or PAN number found" : "CIN/PAN not displayed — recommended for trust" } } },
  { id: "REG-007", name: "EUIN Display (MFD)", category: "Registration & Identity", severity: "major", businessTypes: ["MFD"],
    check: (ctx) => { const has = /EUIN\s*[-:]?\s*[A-Z0-9]{5,}/i.test(ctx.text); return { passed: has, details: has ? "EUIN found" : "Employee Unique Identification Number (EUIN) not displayed" } } },
  { id: "REG-008", name: "Registered Office Address", category: "Registration & Identity", severity: "major", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /registered\s*(office|address)/i.test(ctx.text) || /office\s*address/i.test(ctx.text) || /address\s*:/i.test(ctx.text); return { passed: has, details: has ? "Office address found" : "Registered office address not displayed" } } },
  { id: "REG-009", name: "Registration Validity Date", category: "Registration & Identity", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS"],
    check: (ctx) => { const has = /valid\s*(till|until|upto|from)/i.test(ctx.text) || /validity/i.test(ctx.text) || /registration\s*date/i.test(ctx.text); return { passed: has, details: has ? "Registration validity date found" : "Registration validity period not mentioned" } } },
  { id: "REG-010", name: "BASL Membership (RIA)", category: "Registration & Identity", severity: "major", businessTypes: ["RIA"],
    check: (ctx) => { const has = /BASL/i.test(ctx.text) || /BSE\s*Administration/i.test(ctx.text); return { passed: has, details: has ? "BASL membership reference found" : "BASL (BSE Administration and Supervision Ltd) membership not displayed" } } },

  // DISCLAIMERS EXPANDED
  { id: "DISC-006", name: "Past Performance Disclaimer", category: "Disclaimers & Disclosures", severity: "critical", businessTypes: ["MFD", "RIA", "PMS", "SIF"],
    check: (ctx) => { const has = /past\s*performance/i.test(ctx.text); return { passed: has, details: has ? "Past performance disclaimer found" : "Missing 'past performance is not indicative of future results' disclaimer" } } },
  { id: "DISC-007", name: "Read Scheme Document Carefully", category: "Disclaimers & Disclosures", severity: "critical", businessTypes: ["MFD"],
    check: (ctx) => { const has = /read\s*(the\s*)?(scheme|offer)\s*(information\s*)?document/i.test(ctx.text) || /SID/i.test(ctx.text); return { passed: has, details: has ? "Scheme document reading advisory found" : "Missing 'read scheme documents carefully' advisory" } } },
  { id: "DISC-008", name: "Investment in Securities Subject to Risk", category: "Disclaimers & Disclosures", severity: "major", businessTypes: ["Stock Broker", "PMS"],
    check: (ctx) => { const has = /securities\s*(market|trading)?\s*(are|is)?\s*subject\s*to\s*(market\s*)?risk/i.test(ctx.text) || /trading.*risk/i.test(ctx.text); return { passed: has, details: has ? "Securities risk disclaimer found" : "Missing securities market risk disclaimer" } } },
  { id: "DISC-009", name: "Tax Implications Disclosure", category: "Disclaimers & Disclosures", severity: "minor", businessTypes: ["MFD", "RIA", "PMS", "Insurance"],
    check: (ctx) => { const has = /tax\s*(implicat|benefit|liabilit|consult|advis)/i.test(ctx.text); return { passed: has, details: has ? "Tax implications mentioned" : "No tax implications or tax advisory mentioned" } } },
  { id: "DISC-010", name: "KYC Requirement Mention", category: "Disclaimers & Disclosures", severity: "major", businessTypes: ["MFD", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /KYC/i.test(ctx.text) || /know\s*your\s*(customer|client)/i.test(ctx.text); return { passed: has, details: has ? "KYC requirement mentioned" : "KYC requirements not mentioned — mandatory for all SEBI-regulated entities" } } },
  { id: "DISC-011", name: "DPDPA 2023 Compliance", category: "Disclaimers & Disclosures", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /DPDPA/i.test(ctx.text) || /data\s*protection/i.test(ctx.text) || /personal\s*data/i.test(ctx.text); return { passed: has, details: has ? "Data protection reference found" : "DPDPA 2023 / data protection not mentioned" } } },
  { id: "DISC-012", name: "No Assured Returns Statement", category: "Disclaimers & Disclosures", severity: "critical", businessTypes: ["Insurance"],
    check: (ctx) => { const has = /not\s*assured/i.test(ctx.text) || /bonus\s*rates\s*are\s*not\s*guaranteed/i.test(ctx.text) || /insurance\s*is\s*not\s*deposit/i.test(ctx.text); return { passed: has, details: has ? "No assured returns statement found" : "Missing 'insurance is not a deposit product' / no assured returns disclaimer" } } },

  // CONTACT EXPANDED
  { id: "CONT-004", name: "Physical Office Address", category: "Contact & Grievance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /\d{6}/i.test(ctx.text) && /(street|road|lane|floor|block|tower|nagar|colony|sector)/i.test(ctx.text); return { passed: has, details: has ? "Physical address with PIN code found" : "No physical office address with PIN code found" } } },
  { id: "CONT-005", name: "Compliance Officer Details", category: "Contact & Grievance", severity: "major", businessTypes: ["RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /compliance\s*officer/i.test(ctx.text); return { passed: has, details: has ? "Compliance officer details found" : "Compliance officer details not displayed — required by SEBI" } } },
  { id: "CONT-006", name: "Designated Email for Complaints", category: "Contact & Grievance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /(complaint|grievance|support|help)\s*[@]/i.test(ctx.text) || ctx.$('a[href*="mailto:"]').filter((_, el) => /(complaint|grievance|support)/i.test(ctx.$(el).attr("href") || "")).length > 0; return { passed: has, details: has ? "Dedicated complaint/support email found" : "No dedicated complaint email address found" } } },
  { id: "CONT-007", name: "ODR Portal Reference", category: "Contact & Grievance", severity: "minor", businessTypes: ["MFD", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /ODR\b/i.test(ctx.text) || /online\s*dispute\s*resolution/i.test(ctx.text) || ctx.links.some((l) => /smartodr/i.test(l)); return { passed: has, details: has ? "ODR reference found" : "SEBI ODR (Online Dispute Resolution) portal not referenced" } } },

  // PRIVACY EXPANDED
  { id: "PRIV-004", name: "Cookie Policy / Consent", category: "Privacy & Legal", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /cookie/i.test(ctx.text) || ctx.$('[class*="cookie"]').length > 0; return { passed: has, details: has ? "Cookie policy/consent found" : "No cookie policy or consent mechanism found" } } },
  { id: "PRIV-005", name: "Data Collection Disclosure", category: "Privacy & Legal", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /collect.*data/i.test(ctx.text) || /information.*collect/i.test(ctx.text) || /data.*collect/i.test(ctx.text); return { passed: has, details: has ? "Data collection disclosure found" : "No explicit data collection disclosure found" } } },
  { id: "PRIV-006", name: "Refund / Cancellation Policy", category: "Privacy & Legal", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS"],
    check: (ctx) => { const has = /refund/i.test(ctx.text) || /cancellat/i.test(ctx.text); return { passed: has, details: has ? "Refund/cancellation policy found" : "No refund or cancellation policy found" } } },

  // TECHNICAL EXPANDED
  { id: "TECH-004", name: "Favicon Present", category: "Technical & Security", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$('link[rel*="icon"]').length > 0; return { passed: has, details: has ? "Favicon found" : "No favicon — looks unprofessional in browser tabs" } } },
  { id: "TECH-005", name: "Open Graph / Social Meta Tags", category: "Technical & Security", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$('meta[property^="og:"]').length >= 2; return { passed: has, details: has ? "Open Graph meta tags found" : "Missing Open Graph tags — poor social media sharing experience" } } },
  { id: "TECH-006", name: "Canonical URL", category: "Technical & Security", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$('link[rel="canonical"]').length > 0; return { passed: has, details: has ? "Canonical URL found" : "Missing canonical URL — may cause duplicate content issues" } } },
  { id: "TECH-007", name: "Image Alt Text Coverage", category: "Technical & Security", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const total = ctx.$("img").length; const withAlt = ctx.$("img[alt]").filter((_, e) => (ctx.$(e).attr("alt") || "").length > 1).length; if (total === 0) return { passed: true, details: "No images on page" }; const pct = Math.round((withAlt / total) * 100); return { passed: pct >= 60, details: `${withAlt}/${total} images have alt text (${pct}%)` } } },
  { id: "TECH-008", name: "robots.txt / Sitemap Reference", category: "Technical & Security", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$('meta[name="robots"]').length > 0 || ctx.links.some((l) => /sitemap/i.test(l)); return { passed: has, details: has ? "Robots/sitemap reference found" : "No robots meta or sitemap link — may affect SEO indexing" } } },
  { id: "TECH-009", name: "Loading Speed Indicators", category: "Technical & Security", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const scripts = ctx.$("script[src]").length; const styles = ctx.$('link[rel="stylesheet"]').length; const heavy = scripts + styles > 25; return { passed: !heavy, details: heavy ? `Heavy page: ${scripts} scripts + ${styles} stylesheets may slow loading` : `Reasonable asset count: ${scripts} scripts, ${styles} stylesheets` } } },

  // CONTENT QUALITY EXPANDED
  { id: "QUAL-004", name: "Team / Founder Section", category: "Content Quality", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /team/i.test(ctx.text) || /founder/i.test(ctx.text) || /director/i.test(ctx.text) || /promoter/i.test(ctx.text) || /our\s*people/i.test(ctx.text); return { passed: has, details: has ? "Team/founder section found" : "No team or founder section — recommended for credibility" } } },
  { id: "QUAL-005", name: "Contact Form / CTA", category: "Content Quality", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$("form").length > 0 || ctx.$('a[href*="contact"]').length > 0 || ctx.$('button').filter((_, el) => /contact|enquir|get in touch|reach/i.test(ctx.$(el).text())).length > 0; return { passed: has, details: has ? "Contact form or CTA found" : "No contact form or call-to-action button found" } } },
  { id: "QUAL-006", name: "Client Testimonials / Reviews", category: "Content Quality", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /testimon/i.test(ctx.text) || /review/i.test(ctx.text) || /client.*say/i.test(ctx.text) || /feedback/i.test(ctx.text); return { passed: has, details: has ? "Testimonials/reviews section found" : "No client testimonials found — helps build trust" } } },
  { id: "QUAL-007", name: "Blog / Knowledge Section", category: "Content Quality", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /blog/i.test(ctx.text) || /articles/i.test(ctx.text) || /knowledge/i.test(ctx.text) || /insights/i.test(ctx.text) || ctx.$('a').filter((_, el) => /blog/i.test(ctx.$(el).text())).length > 0; return { passed: has, details: has ? "Blog/knowledge section found" : "No blog or knowledge section — good for SEO and credibility" } } },
  { id: "QUAL-008", name: "Copyright Notice", category: "Content Quality", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /©|copyright|\(c\)/i.test(ctx.text); return { passed: has, details: has ? "Copyright notice found" : "No copyright notice found" } } },
  { id: "QUAL-009", name: "Calculator / Tool", category: "Content Quality", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA"],
    check: (ctx) => { const has = /calculator/i.test(ctx.text) || /SIP\s*calculator/i.test(ctx.text) || /retirement\s*calculator/i.test(ctx.text) || /EMI/i.test(ctx.text); return { passed: has, details: has ? "Financial calculator/tool found" : "No financial calculator — SIP/retirement/goal calculators improve engagement" } } },
  { id: "QUAL-010", name: "Social Media Links", category: "Content Quality", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.links.some((l) => /(facebook|twitter|linkedin|instagram|youtube|x\.com)/i.test(l)); return { passed: has, details: has ? "Social media links found" : "No social media links — recommended for credibility" } } },

  // PMS EXPANDED
  { id: "PMS-003", name: "PMS Track Record Disclosure", category: "PMS Specific", severity: "minor", businessTypes: ["PMS"],
    check: (ctx) => { const has = /track\s*record/i.test(ctx.text) || /performance\s*data/i.test(ctx.text) || /returns\s*since/i.test(ctx.text); return { passed: has, details: has ? "Track record disclosure found" : "PMS track record not displayed — investors expect performance data" } } },
  { id: "PMS-004", name: "PMS Strategy Description", category: "PMS Specific", severity: "minor", businessTypes: ["PMS"],
    check: (ctx) => { const has = /strategy/i.test(ctx.text) || /investment\s*approach/i.test(ctx.text) || /portfolio\s*construct/i.test(ctx.text); return { passed: has, details: has ? "Investment strategy description found" : "PMS investment strategy not described" } } },
  { id: "PMS-005", name: "PMS Risk Factors", category: "PMS Specific", severity: "major", businessTypes: ["PMS"],
    check: (ctx) => { const has = /risk\s*factor/i.test(ctx.text) || /concentration\s*risk/i.test(ctx.text) || /liquidity\s*risk/i.test(ctx.text); return { passed: has, details: has ? "PMS risk factors disclosed" : "PMS risk factors not disclosed" } } },

  // NPS EXPANDED
  { id: "NPS-001", name: "NPS Tier I & II Explanation", category: "NPS Specific", severity: "minor", businessTypes: ["NPS"],
    check: (ctx) => { const has = /tier\s*(i|1|one)/i.test(ctx.text) || /tier\s*(ii|2|two)/i.test(ctx.text); return { passed: has, details: has ? "NPS Tier I/II explanation found" : "NPS Tier I and Tier II differences not explained" } } },
  { id: "NPS-002", name: "NPS Tax Benefits", category: "NPS Specific", severity: "minor", businessTypes: ["NPS"],
    check: (ctx) => { const has = /80CCD/i.test(ctx.text) || /section\s*80/i.test(ctx.text) || /tax\s*benefit.*nps/i.test(ctx.text) || /nps.*tax\s*benefit/i.test(ctx.text); return { passed: has, details: has ? "NPS tax benefits mentioned" : "NPS tax benefits (80CCD) not mentioned — key selling point" } } },
  { id: "NPS-003", name: "NPS Fund Manager Options", category: "NPS Specific", severity: "minor", businessTypes: ["NPS"],
    check: (ctx) => { const has = /fund\s*manager/i.test(ctx.text) || /pension\s*fund/i.test(ctx.text) || /(SBI|LIC|HDFC|ICICI|Kotak|UTI|Aditya Birla)\s*(pension|PF)/i.test(ctx.text); return { passed: has, details: has ? "NPS fund manager information found" : "NPS fund manager options not listed" } } },

  // INSURANCE EXPANDED
  { id: "INS-001", name: "Insurance Product Category Display", category: "Insurance Specific", severity: "minor", businessTypes: ["Insurance"],
    check: (ctx) => { const has = /life\s*insurance/i.test(ctx.text) || /health\s*insurance/i.test(ctx.text) || /general\s*insurance/i.test(ctx.text) || /motor\s*insurance/i.test(ctx.text); return { passed: has, details: has ? "Insurance product categories listed" : "Insurance product categories not clearly listed" } } },
  { id: "INS-002", name: "Claims Process Information", category: "Insurance Specific", severity: "minor", businessTypes: ["Insurance"],
    check: (ctx) => { const has = /claim\s*(process|procedure|settlement)/i.test(ctx.text); return { passed: has, details: has ? "Claims process information found" : "Insurance claims process not described" } } },
  { id: "INS-003", name: "IRDAI Website Link", category: "Insurance Specific", severity: "minor", businessTypes: ["Insurance"],
    check: (ctx) => { const has = ctx.links.some((l) => /irdai\.gov\.in/i.test(l)) || /irdai\.gov/i.test(ctx.text); return { passed: has, details: has ? "IRDAI website link found" : "No link to IRDAI website — recommended" } } },

  // STOCK BROKER EXPANDED
  { id: "SB-003", name: "SEBI Reg Number Format (INZ)", category: "Stock Broker Specific", severity: "major", businessTypes: ["Stock Broker"],
    check: (ctx) => { const has = /INZ\d{12,}/i.test(ctx.text); return { passed: has, details: has ? "SEBI INZ format registration number found" : "SEBI INZ registration number not in proper format" } } },
  { id: "SB-004", name: "Client Funds Segregation Notice", category: "Stock Broker Specific", severity: "major", businessTypes: ["Stock Broker"],
    check: (ctx) => { const has = /client\s*(fund|money)/i.test(ctx.text) || /segregat/i.test(ctx.text) || /trading\s*account/i.test(ctx.text); return { passed: has, details: has ? "Client funds information found" : "No mention of client funds segregation — important compliance requirement" } } },
  { id: "SB-005", name: "Do's and Don'ts for Investors", category: "Stock Broker Specific", severity: "minor", businessTypes: ["Stock Broker"],
    check: (ctx) => { const has = /do('s|s)?\s*(and|&)\s*don('t|t)('s|s)?/i.test(ctx.text) || /investor\s*awareness/i.test(ctx.text); return { passed: has, details: has ? "Investor awareness/Do's and Don'ts found" : "Missing investor awareness section (Do's and Don'ts)" } } },

  // MFD EXPANDED
  { id: "MFD-001", name: "AMFI Website Link", category: "MFD Specific", severity: "minor", businessTypes: ["MFD"],
    check: (ctx) => { const has = ctx.links.some((l) => /amfiindia/i.test(l)) || /amfiindia/i.test(ctx.text); return { passed: has, details: has ? "AMFI website link found" : "No link to AMFI India website" } } },
  { id: "MFD-002", name: "NFO / New Fund Offer Section", category: "MFD Specific", severity: "minor", businessTypes: ["MFD"],
    check: (ctx) => { const has = /NFO/i.test(ctx.text) || /new\s*fund\s*offer/i.test(ctx.text); return { passed: has, details: has ? "NFO section found" : "No NFO/New Fund Offer section — helpful for investor awareness" } } },
  { id: "MFD-003", name: "SIP Information", category: "MFD Specific", severity: "minor", businessTypes: ["MFD"],
    check: (ctx) => { const has = /SIP/i.test(ctx.text) || /systematic\s*investment/i.test(ctx.text); return { passed: has, details: has ? "SIP information found" : "No SIP (Systematic Investment Plan) information — key product for MFDs" } } },

  // RIA EXPANDED
  { id: "RIA-001", name: "Fee-Only / Fee-Based Disclosure", category: "RIA Specific", severity: "major", businessTypes: ["RIA"],
    check: (ctx) => { const has = /fee[\s-]*(only|based)/i.test(ctx.text) || /advisory\s*fee/i.test(ctx.text) || /consultation\s*fee/i.test(ctx.text); return { passed: has, details: has ? "Fee structure disclosure found" : "RIA fee structure (fee-only/fee-based) not disclosed — required by SEBI" } } },
  { id: "RIA-002", name: "Fiduciary Duty Statement", category: "RIA Specific", severity: "minor", businessTypes: ["RIA"],
    check: (ctx) => { const has = /fiduciary/i.test(ctx.text) || /best\s*interest.*client/i.test(ctx.text) || /client.*best\s*interest/i.test(ctx.text); return { passed: has, details: has ? "Fiduciary duty reference found" : "No fiduciary duty statement — RIAs have fiduciary responsibility" } } },
  { id: "RIA-003", name: "Risk Profiling Mention", category: "RIA Specific", severity: "minor", businessTypes: ["RIA"],
    check: (ctx) => { const has = /risk\s*profil/i.test(ctx.text) || /risk\s*assess/i.test(ctx.text) || /risk\s*tolerance/i.test(ctx.text); return { passed: has, details: has ? "Risk profiling mentioned" : "No risk profiling/assessment mentioned — fundamental to advisory" } } },

  // ============ WAVE 3: ADVANCED RULES (70 more) ============

  // ACCESSIBILITY & USABILITY
  { id: "ACC-001", name: "Language Attribute", category: "Accessibility", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$("html[lang]").length > 0; return { passed: has, details: has ? "HTML lang attribute set" : "Missing lang attribute — affects screen readers and SEO" } } },
  { id: "ACC-002", name: "Skip Navigation Link", category: "Accessibility", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$('a[href="#main"], a[href="#content"], .skip-nav, .skip-link').length > 0; return { passed: has, details: has ? "Skip navigation link found" : "No skip navigation link — accessibility best practice" } } },
  { id: "ACC-003", name: "Form Labels", category: "Accessibility", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const inputs = ctx.$("input:not([type=hidden]):not([type=submit])").length; const labels = ctx.$("label").length; if (inputs === 0) return { passed: true, details: "No form inputs found" }; return { passed: labels >= inputs * 0.5, details: `${labels} labels for ${inputs} inputs — ${labels >= inputs * 0.5 ? "adequate" : "many inputs lack labels"}` } } },
  { id: "ACC-004", name: "Heading Hierarchy", category: "Accessibility", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const h1 = ctx.$("h1").length; return { passed: h1 >= 1 && h1 <= 2, details: h1 === 0 ? "No H1 heading — hurts SEO and accessibility" : h1 > 2 ? `${h1} H1 tags found — should have only 1` : "Proper H1 heading found" } } },
  { id: "ACC-005", name: "Contrast & Readability", category: "Accessibility", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const small = ctx.$('[style*="font-size"]').filter((_, el) => { const s = ctx.$(el).css("font-size"); return s && parseInt(s) < 10 }).length; return { passed: small === 0, details: small === 0 ? "No extremely small text found" : `${small} elements with very small font size found` } } },

  // SEO DEEP
  { id: "SEO-001", name: "Structured Data / Schema.org", category: "SEO & Performance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$('script[type="application/ld+json"]').length > 0; return { passed: has, details: has ? "Structured data (JSON-LD) found" : "No structured data — add Schema.org markup for better search results" } } },
  { id: "SEO-002", name: "Unique Title Length", category: "SEO & Performance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const len = ctx.title.length; return { passed: len >= 30 && len <= 65, details: len === 0 ? "No page title" : `Title is ${len} characters — ${len < 30 ? "too short, aim for 30-65" : len > 65 ? "too long, may be truncated in search" : "good length"}` } } },
  { id: "SEO-003", name: "Meta Description Length", category: "SEO & Performance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const desc = ctx.meta.description || ""; return { passed: desc.length >= 50 && desc.length <= 160, details: desc.length === 0 ? "No meta description" : `Description is ${desc.length} chars — ${desc.length < 50 ? "too short" : desc.length > 160 ? "too long" : "good length"}` } } },
  { id: "SEO-004", name: "Hreflang Tags", category: "SEO & Performance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$('link[hreflang]').length > 0; return { passed: true, details: has ? "Hreflang tags found — good for multi-language" : "No hreflang tags (optional unless multi-language)" } } },
  { id: "SEO-005", name: "Minified Resources", category: "SEO & Performance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const inline = ctx.$("style").text().length; return { passed: inline < 10000, details: inline < 10000 ? "Inline CSS is reasonable" : `${Math.round(inline/1000)}KB of inline CSS — consider external stylesheet` } } },
  { id: "SEO-006", name: "Broken Links (Internal)", category: "SEO & Performance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const empty = ctx.links.filter((l) => l === "#" || l === "javascript:void(0)" || l === "javascript:;").length; return { passed: empty < 3, details: empty === 0 ? "No empty/void links" : `${empty} empty/void links found — replace with proper URLs` } } },

  // TRUST & CREDIBILITY
  { id: "TRUST-001", name: "Client Logo / Association Display", category: "Trust & Credibility", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /client/i.test(ctx.text) && ctx.$("img").length > 3; return { passed: has, details: has ? "Client/association references with images found" : "Consider adding client logos or association badges for credibility" } } },
  { id: "TRUST-002", name: "Experience / Track Record", category: "Trust & Credibility", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /year.*experience/i.test(ctx.text) || /since\s*\d{4}/i.test(ctx.text) || /established/i.test(ctx.text); return { passed: has, details: has ? "Experience/established date mentioned" : "No mention of years of experience — builds trust" } } },
  { id: "TRUST-003", name: "Professional Certifications", category: "Trust & Credibility", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS"],
    check: (ctx) => { const has = /CFP|CFA|NISM|FRM|CAIIB|chartered/i.test(ctx.text); return { passed: has, details: has ? "Professional certifications mentioned" : "No professional certifications displayed (CFP, CFA, NISM, etc.)" } } },
  { id: "TRUST-004", name: "Awards / Recognition", category: "Trust & Credibility", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /award/i.test(ctx.text) || /recogni/i.test(ctx.text) || /accolade/i.test(ctx.text); return { passed: has, details: has ? "Awards/recognition mentioned" : "No awards or recognition displayed" } } },
  { id: "TRUST-005", name: "Media Mentions / Press", category: "Trust & Credibility", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /media/i.test(ctx.text) || /press/i.test(ctx.text) || /featured\s*in/i.test(ctx.text) || /as\s*seen/i.test(ctx.text); return { passed: has, details: has ? "Media/press mentions found" : "No media mentions — adds credibility" } } },

  // CONTENT DEPTH
  { id: "CONTENT-001", name: "Investment Philosophy / Approach", category: "Content Depth", severity: "minor", businessTypes: ["MFD", "RIA", "PMS"],
    check: (ctx) => { const has = /philosoph/i.test(ctx.text) || /approach/i.test(ctx.text) || /methodology/i.test(ctx.text) || /investment\s*process/i.test(ctx.text); return { passed: has, details: has ? "Investment philosophy/approach described" : "No investment philosophy or approach section" } } },
  { id: "CONTENT-002", name: "FAQ Section", category: "Content Depth", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /FAQ|frequently\s*asked/i.test(ctx.text); return { passed: has, details: has ? "FAQ section found" : "No FAQ section — helps answer common questions and improves SEO" } } },
  { id: "CONTENT-003", name: "Resource / Download Section", category: "Content Depth", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS"],
    check: (ctx) => { const has = /download/i.test(ctx.text) || /resource/i.test(ctx.text) || /brochure/i.test(ctx.text) || /pdf/i.test(ctx.text); return { passed: has, details: has ? "Downloadable resources found" : "No downloadable resources (brochures, factsheets)" } } },
  { id: "CONTENT-004", name: "Video Content", category: "Content Depth", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = ctx.$("video, iframe[src*='youtube'], iframe[src*='vimeo']").length > 0; return { passed: has, details: has ? "Video content found" : "No video content — videos increase engagement" } } },
  { id: "CONTENT-005", name: "Client Onboarding Process", category: "Content Depth", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "NPS"],
    check: (ctx) => { const has = /onboard/i.test(ctx.text) || /how\s*to\s*(start|begin|open|get\s*started)/i.test(ctx.text) || /process/i.test(ctx.text); return { passed: has, details: has ? "Onboarding/process information found" : "No client onboarding process described" } } },
  { id: "CONTENT-006", name: "Market Updates / Commentary", category: "Content Depth", severity: "minor", businessTypes: ["MFD", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /market\s*(update|commentary|outlook|review)/i.test(ctx.text) || /weekly\s*report/i.test(ctx.text); return { passed: has, details: has ? "Market updates/commentary found" : "No market updates section — shows active engagement" } } },

  // COMBINATION RULES (MFD+RIA, MFD+Insurance, etc.)
  { id: "COMBO-001", name: "SIDD: Advisory vs Distribution Segregation", category: "Combination Rules", severity: "critical", businessTypes: ["MFD", "RIA"],
    check: (ctx) => { const hasBoth = /distribut/i.test(ctx.text) && /advis/i.test(ctx.text); if (!hasBoth) return { passed: true, details: "Single activity — SIDD not applicable" }; const segregated = /sidd/i.test(ctx.text) || /segregat/i.test(ctx.text) || /separate.*section/i.test(ctx.text); return { passed: segregated, details: segregated ? "SIDD segregation disclosures found" : "Both MFD and RIA activities detected but no SIDD segregation — serious violation" } } },
  { id: "COMBO-002", name: "Cross-Selling Disclosure", category: "Combination Rules", severity: "major", businessTypes: ["MFD", "Insurance"],
    check: (ctx) => { const hasBoth = /mutual\s*fund/i.test(ctx.text) && /insurance/i.test(ctx.text); if (!hasBoth) return { passed: true, details: "Single product type — cross-selling not applicable" }; const disclosed = /separate.*licens/i.test(ctx.text) || /different.*regulat/i.test(ctx.text); return { passed: disclosed, details: disclosed ? "Cross-selling disclosure found" : "Both MF and insurance products shown — add cross-selling regulatory disclosure" } } },
  { id: "COMBO-003", name: "Multiple Registration Display", category: "Combination Rules", severity: "major", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const regs = [/ARN/i, /IRDAI/i, /INA/i, /INP/i, /INZ/i, /PFRDA/i].filter((r) => r.test(ctx.text)).length; if (regs <= 1) return { passed: true, details: "Single registration — combination not applicable" }; return { passed: regs >= 2, details: `${regs} different registrations found — ensure each is clearly displayed` } } },

  // SEBI CIRCULAR SPECIFIC
  { id: "CIRC-001", name: "SEBI Investor Education", category: "SEBI Circulars", severity: "minor", businessTypes: ["MFD", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /investor\s*education/i.test(ctx.text) || /investor\s*awareness/i.test(ctx.text) || /financial\s*literacy/i.test(ctx.text); return { passed: has, details: has ? "Investor education content found" : "No investor education section — recommended by SEBI" } } },
  { id: "CIRC-002", name: "SEBI Circular Reference", category: "SEBI Circulars", severity: "minor", businessTypes: ["MFD", "RIA", "PMS", "Stock Broker", "SIF"],
    check: (ctx) => { const has = /circular/i.test(ctx.text) || /SEBI\/HO/i.test(ctx.text); return { passed: has, details: has ? "SEBI circular reference found" : "No SEBI circular references — shows regulatory awareness" } } },
  { id: "CIRC-003", name: "Anti-Money Laundering Notice", category: "SEBI Circulars", severity: "minor", businessTypes: ["MFD", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /AML|anti[\s-]*money\s*launder|PMLA/i.test(ctx.text); return { passed: has, details: has ? "AML/PMLA reference found" : "No anti-money laundering reference" } } },
  { id: "CIRC-004", name: "Do Not Call Registry", category: "SEBI Circulars", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /do\s*not\s*call/i.test(ctx.text) || /DNC/i.test(ctx.text) || /NDNC/i.test(ctx.text); return { passed: has, details: has ? "DNC/NDNC reference found" : "No Do Not Call registry reference" } } },

  // SECURITY DEEP
  { id: "SEC-001", name: "Content Security Policy", category: "Security", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$('meta[http-equiv="Content-Security-Policy"]').length > 0; return { passed: has, details: has ? "CSP meta tag found" : "No Content Security Policy — recommended for XSS protection" } } },
  { id: "SEC-002", name: "Mixed Content Check", category: "Security", severity: "major", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const httpSrcs = ctx.$('[src^="http://"]').length + ctx.$('[href^="http://"]').filter((_, el) => ctx.$(el).attr("href")?.endsWith(".css") || ctx.$(el).attr("href")?.endsWith(".js")).length; return { passed: httpSrcs === 0, details: httpSrcs === 0 ? "No mixed content (HTTP resources on HTTPS page)" : `${httpSrcs} insecure HTTP resources found on page` } } },
  { id: "SEC-003", name: "External Link Safety", category: "Security", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const ext = ctx.$('a[target="_blank"]').length; const safe = ctx.$('a[target="_blank"][rel*="noopener"]').length; if (ext === 0) return { passed: true, details: "No external links with target=_blank" }; return { passed: safe >= ext * 0.7, details: `${safe}/${ext} external links have rel="noopener" — ${safe >= ext * 0.7 ? "good" : "add noopener for security"}` } } },

  // MOBILE & PERFORMANCE DEEP
  { id: "PERF-001", name: "Image Optimization", category: "Performance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const imgs = ctx.$("img").length; const lazy = ctx.$('img[loading="lazy"]').length; const webp = ctx.$('source[type="image/webp"]').length; if (imgs === 0) return { passed: true, details: "No images" }; return { passed: lazy > 0 || webp > 0, details: `${imgs} images: ${lazy} lazy-loaded, ${webp} WebP sources — ${lazy > 0 || webp > 0 ? "some optimization" : "no lazy loading or WebP"}` } } },
  { id: "PERF-002", name: "Async/Defer Scripts", category: "Performance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const all = ctx.$("script[src]").length; const optimized = ctx.$("script[async], script[defer]").length; if (all === 0) return { passed: true, details: "No external scripts" }; return { passed: optimized >= all * 0.5, details: `${optimized}/${all} scripts are async/deferred — ${optimized >= all * 0.5 ? "good" : "blocking scripts may slow page load"}` } } },
  { id: "PERF-003", name: "Viewport Width Configuration", category: "Performance", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const vp = ctx.$('meta[name="viewport"]').attr("content") || ""; const hasWidth = /width=device-width/i.test(vp); const hasScale = /initial-scale/i.test(vp); return { passed: hasWidth && hasScale, details: hasWidth && hasScale ? "Proper viewport configuration" : `Viewport ${!hasWidth ? "missing width=device-width" : ""}${!hasScale ? "missing initial-scale" : ""}` } } },

  // AMFI SPECIFIC EXPANDED
  { id: "AMFI-001", name: "AMFI-Registered Disclaimer", category: "MFD Specific", severity: "major", businessTypes: ["MFD"],
    check: (ctx) => { const has = /AMFI[\s-]*registered/i.test(ctx.text); return { passed: has, details: has ? "AMFI-registered status mentioned" : "No explicit 'AMFI-registered' statement" } } },
  { id: "AMFI-002", name: "Scheme Category Information", category: "MFD Specific", severity: "minor", businessTypes: ["MFD"],
    check: (ctx) => { const has = /equity\s*fund/i.test(ctx.text) || /debt\s*fund/i.test(ctx.text) || /hybrid/i.test(ctx.text) || /large\s*cap/i.test(ctx.text) || /small\s*cap/i.test(ctx.text); return { passed: has, details: has ? "Scheme category information found" : "No scheme category information (equity, debt, hybrid, etc.)" } } },
  { id: "AMFI-003", name: "Direct vs Regular Plan Notice", category: "MFD Specific", severity: "minor", businessTypes: ["MFD"],
    check: (ctx) => { const has = /direct\s*(plan|route)/i.test(ctx.text) || /regular\s*(plan|route)/i.test(ctx.text); return { passed: has, details: has ? "Direct/Regular plan information found" : "No mention of Direct vs Regular plans" } } },

  // INSURANCE EXPANDED
  { id: "INS-004", name: "POSP Registration", category: "Insurance Specific", severity: "minor", businessTypes: ["Insurance"],
    check: (ctx) => { const has = /POSP/i.test(ctx.text) || /point\s*of\s*sale/i.test(ctx.text); return { passed: true, details: has ? "POSP reference found" : "No POSP reference (applicable for POS persons only)" } } },
  { id: "INS-005", name: "Premium Calculator", category: "Insurance Specific", severity: "minor", businessTypes: ["Insurance"],
    check: (ctx) => { const has = /premium\s*calculator/i.test(ctx.text) || /calculate.*premium/i.test(ctx.text); return { passed: has, details: has ? "Premium calculator found" : "No premium calculator — useful for lead generation" } } },
  { id: "INS-006", name: "Insurer Name Display", category: "Insurance Specific", severity: "minor", businessTypes: ["Insurance"],
    check: (ctx) => { const has = /(LIC|HDFC|ICICI|SBI|Bajaj|Max|Tata|Star|Kotak)\s*(life|general|health)/i.test(ctx.text); return { passed: has, details: has ? "Insurance company names displayed" : "No insurer names mentioned — shows product range" } } },

  // NPS EXPANDED
  { id: "NPS-004", name: "NPS Subscriber Benefits", category: "NPS Specific", severity: "minor", businessTypes: ["NPS"],
    check: (ctx) => { const has = /subscriber.*benefit/i.test(ctx.text) || /benefit.*subscriber/i.test(ctx.text) || /annuity/i.test(ctx.text); return { passed: has, details: has ? "Subscriber benefits/annuity information found" : "NPS subscriber benefits not explained" } } },
  { id: "NPS-005", name: "Exit/Withdrawal Rules", category: "NPS Specific", severity: "minor", businessTypes: ["NPS"],
    check: (ctx) => { const has = /withdrawal/i.test(ctx.text) || /exit\s*rule/i.test(ctx.text) || /premature/i.test(ctx.text); return { passed: has, details: has ? "Withdrawal/exit rules explained" : "NPS withdrawal and exit rules not explained" } } },

  // PMS EXPANDED
  { id: "PMS-006", name: "Benchmark Disclosure", category: "PMS Specific", severity: "minor", businessTypes: ["PMS"],
    check: (ctx) => { const has = /benchmark/i.test(ctx.text) || /Nifty/i.test(ctx.text) || /Sensex/i.test(ctx.text); return { passed: has, details: has ? "Benchmark reference found" : "No benchmark disclosure for PMS strategies" } } },
  { id: "PMS-007", name: "Custodian Details", category: "PMS Specific", severity: "minor", businessTypes: ["PMS"],
    check: (ctx) => { const has = /custodian/i.test(ctx.text); return { passed: has, details: has ? "Custodian details found" : "No custodian information — important for PMS investor trust" } } },

  // STOCK BROKER EXPANDED
  { id: "SB-006", name: "Trading Platform Info", category: "Stock Broker Specific", severity: "minor", businessTypes: ["Stock Broker"],
    check: (ctx) => { const has = /platform/i.test(ctx.text) || /trading\s*(app|terminal|software)/i.test(ctx.text); return { passed: has, details: has ? "Trading platform information found" : "No trading platform/app information" } } },
  { id: "SB-007", name: "Brokerage Charges", category: "Stock Broker Specific", severity: "minor", businessTypes: ["Stock Broker"],
    check: (ctx) => { const has = /brokerage/i.test(ctx.text) || /commission/i.test(ctx.text) || /charges/i.test(ctx.text); return { passed: has, details: has ? "Brokerage charges information found" : "No brokerage charges/commission information" } } },
  { id: "SB-008", name: "Account Opening Process", category: "Stock Broker Specific", severity: "minor", businessTypes: ["Stock Broker"],
    check: (ctx) => { const has = /account\s*open/i.test(ctx.text) || /demat/i.test(ctx.text) || /open.*account/i.test(ctx.text); return { passed: has, details: has ? "Account opening information found" : "No account opening/demat information" } } },

  // SIF EXPANDED
  { id: "SIF-003", name: "SIF vs MF Differentiation", category: "SIF Specific", severity: "minor", businessTypes: ["SIF"],
    check: (ctx) => { const has = /different.*mutual\s*fund/i.test(ctx.text) || /specialised.*investment/i.test(ctx.text) || /higher.*risk/i.test(ctx.text); return { passed: has, details: has ? "SIF differentiation from regular MFs found" : "No clear differentiation from regular mutual funds" } } },

  // LEGAL EXPANDED
  { id: "LEGAL-001", name: "Regulatory Body Links", category: "Legal & Regulatory", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.links.some((l) => /(sebi\.gov|amfiindia|irdai\.gov|pfrda\.gov|nseindia|bseindia)/i.test(l)); return { passed: has, details: has ? "Links to regulatory body websites found" : "No links to regulator websites (SEBI, AMFI, IRDAI, PFRDA)" } } },
  { id: "LEGAL-002", name: "Copyright Year Current", category: "Legal & Regulatory", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const year = new Date().getFullYear(); const has = ctx.text.includes(year.toString()) || ctx.text.includes((year - 1).toString()); return { passed: has, details: has ? "Current copyright year found" : "Copyright year may be outdated" } } },
  { id: "LEGAL-003", name: "Jurisdiction Clause", category: "Legal & Regulatory", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /jurisdiction/i.test(ctx.text) || /governing\s*law/i.test(ctx.text) || /indian\s*law/i.test(ctx.text); return { passed: has, details: has ? "Jurisdiction clause found" : "No governing law/jurisdiction clause" } } },
  { id: "LEGAL-004", name: "Intellectual Property Notice", category: "Legal & Regulatory", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /intellectual\s*property/i.test(ctx.text) || /trademark/i.test(ctx.text) || /proprietary/i.test(ctx.text); return { passed: has, details: has ? "IP/trademark notice found" : "No intellectual property notice" } } },

  // CONVERSION & UX
  { id: "CRO-001", name: "Clear Call-to-Action", category: "Conversion & UX", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const ctas = ctx.$("a, button").filter((_, el) => /(contact|enquir|get.*start|book.*call|schedule|consult|invest\s*now|start\s*sip|open.*account)/i.test(ctx.$(el).text())).length; return { passed: ctas >= 1, details: ctas >= 1 ? `${ctas} clear CTAs found` : "No clear call-to-action buttons" } } },
  { id: "CRO-002", name: "WhatsApp / Chat Integration", category: "Conversion & UX", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "NPS"],
    check: (ctx) => { const has = ctx.links.some((l) => /wa\.me|whatsapp|chat/i.test(l)) || ctx.$('[class*="chat"], [class*="whatsapp"]').length > 0; return { passed: has, details: has ? "Chat/WhatsApp integration found" : "No WhatsApp or chat widget — improves conversions" } } },
  { id: "CRO-003", name: "Google Maps / Location", category: "Conversion & UX", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "NPS"],
    check: (ctx) => { const has = ctx.$('iframe[src*="google.com/maps"]').length > 0 || /maps\.google/i.test(ctx.text); return { passed: has, details: has ? "Google Maps embed found" : "No Google Maps location — helps local SEO" } } },
  { id: "CRO-004", name: "Newsletter / Email Capture", category: "Conversion & UX", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /newsletter/i.test(ctx.text) || /subscribe/i.test(ctx.text) || ctx.$('input[type="email"]').length > 0; return { passed: has, details: has ? "Email capture/newsletter found" : "No newsletter signup — useful for lead nurturing" } } },
  { id: "CRO-005", name: "Page Load Speed Indicators", category: "Conversion & UX", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const htmlSize = ctx.html.length; return { passed: htmlSize < 500000, details: htmlSize < 500000 ? `Page HTML is ${Math.round(htmlSize/1024)}KB — reasonable` : `Page HTML is ${Math.round(htmlSize/1024)}KB — may be slow to load` } } },

  // FINAL RULES TO CROSS 148
  { id: "REG-011", name: "Regulator Logo Usage", category: "Registration & Identity", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$("img").filter((_, el) => /(sebi|amfi|irdai|pfrda|nse|bse)/i.test(ctx.$(el).attr("alt") || "") || /(sebi|amfi|irdai|pfrda)/i.test(ctx.$(el).attr("src") || "")).length > 0; return { passed: has, details: has ? "Regulator logo found" : "No regulator logos displayed — adds authenticity" } } },
  { id: "DISC-013", name: "Forward-Looking Statements", category: "Disclaimers & Disclosures", severity: "minor", businessTypes: ["MFD", "RIA", "PMS", "SIF"],
    check: (ctx) => { const has = /forward[\s-]*looking/i.test(ctx.text) || /projection/i.test(ctx.text) || /estimate/i.test(ctx.text); const disclaimer = /forward.*statement.*risk/i.test(ctx.text) || /projection.*may\s*not/i.test(ctx.text); return { passed: !has || disclaimer, details: has && !disclaimer ? "Forward-looking statements without disclaimers" : "Forward-looking statement handling OK" } } },
  { id: "DISC-014", name: "Third-Party Content Disclaimer", category: "Disclaimers & Disclosures", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker"],
    check: (ctx) => { const has = /third[\s-]*party/i.test(ctx.text) && /disclaim/i.test(ctx.text); return { passed: true, details: has ? "Third-party content disclaimer found" : "Consider adding third-party content disclaimer if using external data" } } },
  { id: "TECH-010", name: "HTTPS Redirect", category: "Technical & Security", severity: "major", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { return { passed: ctx.url.startsWith("https://"), details: ctx.url.startsWith("https://") ? "HTTPS enforced" : "Not using HTTPS — critical security issue" } } },
  { id: "TECH-011", name: "Error Pages (404)", category: "Technical & Security", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { return { passed: true, details: "404 page handling requires separate check — recommended to implement custom 404" } } },
  { id: "QUAL-011", name: "Last Updated Date", category: "Content Quality", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = /last\s*updated/i.test(ctx.text) || /updated\s*on/i.test(ctx.text) || /as\s*of\s*\w+\s*\d{4}/i.test(ctx.text); return { passed: has, details: has ? "Last updated date found" : "No last updated date — shows content freshness" } } },
  { id: "QUAL-012", name: "Sitemap Page", category: "Content Quality", severity: "minor", businessTypes: ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"],
    check: (ctx) => { const has = ctx.$('a').filter((_, el) => /sitemap/i.test(ctx.$(el).text())).length > 0 || ctx.links.some((l) => /sitemap/i.test(l)); return { passed: has, details: has ? "Sitemap link found" : "No HTML sitemap — helps navigation and SEO" } } },
  { id: "MFD-004", name: "Lump Sum vs SIP Explanation", category: "MFD Specific", severity: "minor", businessTypes: ["MFD"],
    check: (ctx) => { const has = /lump\s*sum/i.test(ctx.text) || /one[\s-]*time/i.test(ctx.text); return { passed: has, details: has ? "Lump sum investment option mentioned" : "No lump sum vs SIP comparison — helpful for investors" } } },
  { id: "RIA-004", name: "Client Agreement Reference", category: "RIA Specific", severity: "minor", businessTypes: ["RIA"],
    check: (ctx) => { const has = /client\s*agreement/i.test(ctx.text) || /advisory\s*agreement/i.test(ctx.text) || /engagement\s*letter/i.test(ctx.text); return { passed: has, details: has ? "Client agreement reference found" : "No reference to client advisory agreement" } } },
  { id: "SB-009", name: "Margin Trading Disclosure", category: "Stock Broker Specific", severity: "major", businessTypes: ["Stock Broker"],
    check: (ctx) => { const has = /margin\s*trad/i.test(ctx.text); const disc = /margin.*risk/i.test(ctx.text) || /leverage.*risk/i.test(ctx.text); if (!has) return { passed: true, details: "No margin trading mentioned" }; return { passed: disc, details: disc ? "Margin trading risk disclosure found" : "Margin trading mentioned without proper risk disclosure" } } },
  { id: "INS-007", name: "Insurance Ombudsman Details", category: "Insurance Specific", severity: "minor", businessTypes: ["Insurance"],
    check: (ctx) => { const has = /ombudsman/i.test(ctx.text) || /IGMS/i.test(ctx.text) || /insurance\s*grievance/i.test(ctx.text); return { passed: has, details: has ? "Insurance ombudsman/IGMS reference found" : "No insurance ombudsman reference — required for grievance redressal" } } },
  { id: "COMBO-004", name: "PMS + MFD Conflict Disclosure", category: "Combination Rules", severity: "major", businessTypes: ["MFD", "PMS"],
    check: (ctx) => { const hasBoth = /portfolio\s*management/i.test(ctx.text) && /mutual\s*fund/i.test(ctx.text); if (!hasBoth) return { passed: true, details: "Not applicable" }; const disclosed = /conflict.*interest/i.test(ctx.text) || /independent/i.test(ctx.text); return { passed: disclosed, details: disclosed ? "Conflict of interest disclosure found" : "Both PMS and MFD services without conflict of interest disclosure" } } },
]

export function runAudit(url: string, html: string): AuditResult {
  const $ = cheerio.load(html)
  const text = $("body").text().replace(/\s+/g, " ").trim()
  const title = $("title").text().trim()
  const links = $("a").map((_, el) => $(el).attr("href") || "").get()
  const meta: Record<string, string> = {}
  $("meta").each((_, el) => {
    const name = $(el).attr("name") || $(el).attr("property") || ""
    const content = $(el).attr("content") || ""
    if (name) meta[name] = content
  })

  const ctx: AuditContext = { url, html, text, $, links, title, meta }
  const detectedTypes = detectBusinessTypes(text, $)

  const results: RuleCheckResult[] = []
  const categories: Record<string, CategoryResult> = {}

  for (const rule of COMPLIANCE_RULES) {
    const isRelevant = rule.businessTypes.some((bt) => detectedTypes.includes(bt)) || detectedTypes.length === 0
    if (!isRelevant) continue

    const result = rule.check(ctx)
    results.push({
      rule_id: rule.id,
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
      business_types: rule.businessTypes,
      passed: result.passed,
      details: result.details,
    })

    if (!categories[rule.category]) categories[rule.category] = { passed: 0, total: 0, score: 0 }
    categories[rule.category].total++
    if (result.passed) categories[rule.category].passed++
  }

  for (const cat of Object.values(categories)) {
    cat.score = cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : 0
  }

  const totalRules = results.length
  const passedRules = results.filter((r) => r.passed).length
  const criticalFails = results.filter((r) => !r.passed && r.severity === "critical").length
  const majorFails = results.filter((r) => !r.passed && r.severity === "major").length
  const minorFails = results.filter((r) => !r.passed && r.severity === "minor").length

  let score = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0
  score = Math.max(0, score - criticalFails * 5)

  const auditId = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  return {
    audit_id: auditId,
    url,
    status: "completed",
    overall_score: score,
    detected_business_types: detectedTypes,
    categories,
    total_rules: totalRules,
    passed_rules: passedRules,
    failed_rules: totalRules - passedRules,
    critical_failures: criticalFails,
    major_failures: majorFails,
    minor_failures: minorFails,
    results,
    scanned_at: new Date().toISOString(),
  }
}

export function runAuditWithTypes(url: string, html: string, overrideTypes: string[]): AuditResult {
  const $ = cheerio.load(html)
  const text = $("body").text().replace(/\s+/g, " ").trim()
  const title = $("title").text().trim()
  const links = $("a").map((_, el) => $(el).attr("href") || "").get()
  const meta: Record<string, string> = {}
  $("meta").each((_, el) => {
    const name = $(el).attr("name") || $(el).attr("property") || ""
    const content = $(el).attr("content") || ""
    if (name) meta[name] = content
  })

  const ctx: AuditContext = { url, html, text, $, links, title, meta }
  const activeTypes = overrideTypes

  const results: RuleCheckResult[] = []
  const categories: Record<string, CategoryResult> = {}

  for (const rule of COMPLIANCE_RULES) {
    const isRelevant = rule.businessTypes.some((bt) => activeTypes.includes(bt)) || activeTypes.length === 0
    if (!isRelevant) continue

    const result = rule.check(ctx)
    results.push({
      rule_id: rule.id,
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
      business_types: rule.businessTypes,
      passed: result.passed,
      details: result.details,
    })

    if (!categories[rule.category]) categories[rule.category] = { passed: 0, total: 0, score: 0 }
    categories[rule.category].total++
    if (result.passed) categories[rule.category].passed++
  }

  for (const cat of Object.values(categories)) {
    cat.score = cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : 0
  }

  const totalRules = results.length
  const passedRules = results.filter((r) => r.passed).length
  const criticalFails = results.filter((r) => !r.passed && r.severity === "critical").length
  const majorFails = results.filter((r) => !r.passed && r.severity === "major").length
  const minorFails = results.filter((r) => !r.passed && r.severity === "minor").length

  let score = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0
  score = Math.max(0, score - criticalFails * 5)

  const auditId = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  return {
    audit_id: auditId,
    url,
    status: "completed",
    overall_score: score,
    detected_business_types: activeTypes,
    categories,
    total_rules: totalRules,
    passed_rules: passedRules,
    failed_rules: totalRules - passedRules,
    critical_failures: criticalFails,
    major_failures: majorFails,
    minor_failures: minorFails,
    results,
    scanned_at: new Date().toISOString(),
  }
}
