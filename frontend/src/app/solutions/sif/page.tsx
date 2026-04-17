"use client"
import { SolutionTemplate } from "@/components/solution-template"
import { Zap } from "lucide-react"

export default function SIFPage() {
  return <SolutionTemplate data={{
    type: "SIF", title: "Compliant Websites for Specialised Investment Funds", subtitle: "SEBI Regulated",
    regulator: "SEBI", icon: Zap, color: "bg-rose-600",
    heroDescription: "The new SEBI SIF framework (effective April 2025) requires specific disclosures around minimum investment amounts, risk band classifications, and NISM-XXI-A certifications. We build SIF-compliant websites from day one.",
    keyRegulations: [
      "SEBI registration details for the fund must be displayed",
      "Minimum investment amount (INR 10 lakhs) must be disclosed",
      "Risk band/category disclosure as per SEBI guidelines",
      "NISM-XXI-A certification details of the fund manager",
      "Investment strategy and risk factors must be explained",
      "NAV reporting methodology to be described",
      "No guaranteed returns — SIFs are market-linked",
      "Grievance redressal mechanism with SCORES reference",
    ],
    complianceChecks: [
      { name: "SEBI Registration", severity: "critical", description: "Fund registration details displayed" },
      { name: "Minimum Investment", severity: "major", description: "INR 10 lakh minimum clearly stated" },
      { name: "Risk Band Disclosure", severity: "major", description: "Risk category/band per SEBI norms" },
      { name: "NISM Certification", severity: "minor", description: "Fund manager NISM-XXI-A details" },
      { name: "Investment Strategy", severity: "minor", description: "Strategy and approach explained" },
      { name: "No Guaranteed Returns", severity: "critical", description: "No assured return promises" },
    ],
    commonIssues: [
      { title: "New Framework Unfamiliarity", description: "SIF is a new SEBI framework — many fund websites don't yet have proper SIF-specific disclosures." },
      { title: "Risk Band Missing", description: "SEBI requires risk categorization similar to mutual fund riskometers — often missing on SIF sites." },
      { title: "NISM Certification Not Shown", description: "Fund manager's NISM-XXI-A certification should be displayed for investor confidence." },
    ],
    websitePages: ["Home Page", "About the Fund", "Investment Strategy", "Risk Disclosure", "Minimum Investment", "NAV & Performance", "Fund Manager", "Contact Us", "Grievance Redressal", "Privacy Policy", "Disclaimer"],
    whyCompliance: "As a new SEBI-regulated category, SIFs are under heightened regulatory scrutiny. Early compliance builds trust.",
  }} />
}
