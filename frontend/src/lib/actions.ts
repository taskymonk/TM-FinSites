"use server"

import { createServerClient } from "@/lib/supabase/server"
import { runAudit as runComplianceAudit } from "@/lib/compliance-engine"

const FALLBACK_PLANS = [
  {
    plan_id: "starter",
    name: "Starter",
    price_display: "Starting at INR 9,999",
    description: "Perfect for individual practitioners with a single business type",
    features: [
      "Single business type website",
      "5 core compliance pages",
      "Full regulatory compliance",
      "Standard design template",
      "SSL certificate included",
      "Mobile responsive design",
      "Basic SEO optimization",
      "Email support",
      "7 working days delivery",
    ],
    is_popular: false,
    is_contact_us: false,
  },
  {
    plan_id: "professional",
    name: "Professional",
    price_display: "Starting at INR 24,999",
    description: "Ideal for multi-service firms needing comprehensive compliance",
    features: [
      "Up to 3 business types",
      "8+ pages with blog & calculators",
      "Full compliance + combination rules",
      "Custom design with brand colors",
      "SSL certificate included",
      "Advanced SEO optimization",
      "Priority email + call support",
      "5 working days delivery",
    ],
    is_popular: true,
    is_contact_us: false,
  },
  {
    plan_id: "enterprise",
    name: "Enterprise",
    price_display: "Custom Quote",
    description: "For large firms & institutions needing bespoke solutions",
    features: [
      "Unlimited business type combinations",
      "Unlimited pages",
      "Full compliance + ongoing monitoring",
      "Fully bespoke design",
      "White-label option available",
      "API access",
      "Dedicated account manager",
      "3 working days delivery",
    ],
    is_popular: false,
    is_contact_us: true,
  },
]

export async function fetchPlans() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("plans")
      .select("plan_id, name, price_display, description, features, is_popular, is_contact_us, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error || !data?.length) {
      return FALLBACK_PLANS
    }
    return data
  } catch {
    return FALLBACK_PLANS
  }
}

export async function runAudit(url: string) {
  if (!url || typeof url !== "string") {
    return { error: "URL is required" }
  }

  let targetUrl = url.trim()
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl
  }

  try {
    new URL(targetUrl)
  } catch {
    return { error: "Invalid URL format" }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  let html: string
  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return { error: `Website returned status ${response.status}` }
    }

    html = await response.text()
  } catch (fetchErr) {
    clearTimeout(timeout)
    const msg = fetchErr instanceof Error ? fetchErr.message : "Unknown error"
    if (msg.includes("abort")) {
      return { error: "Website took too long to respond (15s timeout)" }
    }
    return { error: `Could not reach website: ${msg}` }
  }

  const result = runComplianceAudit(targetUrl, html)

  // Try to save to Supabase (non-blocking)
  try {
    const supabase = createServerClient()
    await supabase.from("audits").insert({
      audit_id: result.audit_id,
      url: result.url,
      status: result.status,
      detected_business_types: result.detected_business_types,
      detected_data: { categories: result.categories },
      compliance_report: {
        overall_score: result.overall_score,
        total_rules: result.total_rules,
        passed_rules: result.passed_rules,
        failed_rules: result.failed_rules,
        critical_failures: result.critical_failures,
        major_failures: result.major_failures,
        minor_failures: result.minor_failures,
        results: result.results,
      },
      raw_text: result.url,
    })
  } catch {
    // DB save is optional
  }

  return result
}

export async function submitEnterpriseContact(data: {
  name: string
  email: string
  phone: string
  company: string
  message: string
}) {
  try {
    const supabase = createServerClient()
    const contactId = `ent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await supabase.from("enterprise_contacts").insert({
      contact_id: contactId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      message: data.message,
    })
    return { success: true }
  } catch {
    return { success: true } // Still show success to user even if DB fails
  }
}
