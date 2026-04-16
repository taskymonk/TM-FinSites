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
      const hasDesc = ctx.$('meta[name="description"]').attr("content")?.length ?? 0 > 10
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
