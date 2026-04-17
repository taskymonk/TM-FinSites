"use client"
import { SolutionTemplate } from "@/components/solution-template"
import { Users } from "lucide-react"

export default function NPSPage() {
  return <SolutionTemplate data={{
    type: "NPS", title: "Compliant Websites for NPS Distributors", subtitle: "PFRDA Regulated",
    regulator: "PFRDA", icon: Users, color: "bg-indigo-600",
    heroDescription: "NPS Points of Presence (POPs) and POP-SPs must comply with PFRDA digital guidelines. We build websites that properly display registration details, explain Tier I & II accounts, highlight tax benefits, and list fund manager options.",
    keyRegulations: [
      "PFRDA registration/POP registration number must be displayed",
      "NPS Tier I and Tier II account differences must be explained",
      "Tax benefits under Section 80CCD must be highlighted",
      "Available pension fund manager options should be listed",
      "NPS is a market-linked product — risk disclaimer required",
      "Withdrawal and exit rules must be explained",
      "Grievance mechanism with PFRDA reference",
      "POP or POP-SP status must be clearly stated",
    ],
    complianceChecks: [
      { name: "PFRDA Registration", severity: "critical", description: "POP/POP-SP registration details displayed" },
      { name: "Tier I & II Explanation", severity: "minor", description: "Account type differences explained" },
      { name: "Tax Benefits (80CCD)", severity: "minor", description: "Section 80CCD tax benefits mentioned" },
      { name: "Fund Manager Options", severity: "minor", description: "Available pension fund managers listed" },
      { name: "Market Risk Disclaimer", severity: "major", description: "NPS is market-linked product disclosure" },
      { name: "Grievance Mechanism", severity: "major", description: "PFRDA complaint handling details" },
    ],
    commonIssues: [
      { title: "Missing PFRDA Registration", description: "POP/POP-SP registration number not displayed — the most basic PFRDA requirement." },
      { title: "No Tax Benefit Info", description: "80CCD tax benefits are the primary selling point of NPS — missing this loses both compliance and conversions." },
      { title: "Tier I/II Confusion", description: "Not explaining the differences between Tier I (locked-in) and Tier II (flexible) confuses investors." },
      { title: "No Fund Manager Info", description: "NPS allows choice of fund managers — not listing options is a missed opportunity and compliance gap." },
    ],
    websitePages: ["Home Page", "About Us", "NPS Overview", "Tier I Account", "Tier II Account", "Tax Benefits", "Fund Managers", "Corporate NPS", "Withdrawal Rules", "Contact Us", "Grievance Redressal", "Privacy Policy", "Disclaimer"],
    whyCompliance: "PFRDA monitors POP digital communications. Compliant websites also drive more NPS enrollments through clear tax benefit messaging.",
  }} />
}
