"use client"
import { SolutionTemplate } from "@/components/solution-template"
import { Shield } from "lucide-react"

export default function InsurancePage() {
  return <SolutionTemplate data={{
    type: "Insurance", title: "Compliant Websites for Insurance Professionals", subtitle: "IRDAI Regulated",
    regulator: "IRDAI", icon: Shield, color: "bg-emerald-600",
    heroDescription: "Whether you're an individual agent, corporate agent, broker, or POSP — your website must meet IRDAI's digital presence guidelines. We ensure every disclaimer, license display, and product disclosure is in place.",
    keyRegulations: [
      "IRDAI license/registration number must be displayed",
      "\"Insurance is the subject matter of solicitation\" disclaimer required",
      "IRDAI does not endorse any specific insurance product — must be stated",
      "Policy document reference for all product information",
      "No misleading claims about insurance benefits or returns",
      "ULIPs: \"Insurance is not a deposit product\" notice required",
      "Claims process information should be accessible",
      "Grievance redressal with IGMS/Ombudsman reference",
    ],
    complianceChecks: [
      { name: "IRDAI License Display", severity: "critical", description: "License/registration number must be visible" },
      { name: "Insurance Solicitation Disclaimer", severity: "critical", description: "Standard IRDAI disclaimer about solicitation" },
      { name: "No Assured Returns", severity: "critical", description: "Insurance products cannot guarantee returns" },
      { name: "Product Category Display", severity: "minor", description: "Life, Health, General insurance categories listed" },
      { name: "Claims Process Info", severity: "minor", description: "How to file claims information available" },
      { name: "IRDAI Website Link", severity: "minor", description: "Link to irdai.gov.in for consumer reference" },
      { name: "Policy Document Reference", severity: "major", description: "Reference to read policy documents before purchase" },
      { name: "Grievance Mechanism", severity: "major", description: "Complaint handling and ombudsman details" },
    ],
    commonIssues: [
      { title: "Missing IRDAI License", description: "The most common violation — license number not displayed anywhere on the website." },
      { title: "Guaranteed Return Claims", description: "Promising fixed returns on ULIPs or endowment plans without proper caveats violates IRDAI guidelines." },
      { title: "No Solicitation Disclaimer", description: "The standard IRDAI solicitation disclaimer must appear on every page, typically in the footer." },
      { title: "Missing Claims Info", description: "Consumers need clear information about how to file and track insurance claims." },
    ],
    websitePages: ["Home Page", "About Us", "Life Insurance", "Health Insurance", "Motor Insurance", "Corporate Insurance", "Claims Process", "Contact Us", "Grievance Redressal", "Privacy Policy", "Terms & Conditions", "Disclaimer"],
    whyCompliance: "IRDAI actively monitors digital communications. Non-compliant websites can lead to license suspension and penalties.",
  }} />
}
