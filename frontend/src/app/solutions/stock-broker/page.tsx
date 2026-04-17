"use client"
import { SolutionTemplate } from "@/components/solution-template"
import { Layers } from "lucide-react"

export default function StockBrokerPage() {
  return <SolutionTemplate data={{
    type: "Stock Broker", title: "Compliant Websites for Stock Brokers & Authorized Persons", subtitle: "SEBI / NSE / BSE Regulated",
    regulator: "SEBI / NSE / BSE", icon: Layers, color: "bg-amber-600",
    heroDescription: "Stock brokers and authorized persons must comply with SEBI, NSE, and BSE website requirements including exchange membership details, investor charter, client fund segregation notices, and Do's & Don'ts for investors.",
    keyRegulations: [
      "SEBI registration number (INZ format) must be displayed",
      "Exchange membership details (NSE/BSE) required",
      "Investor Charter as mandated by SEBI must be linked",
      "Client fund segregation notice is mandatory",
      "Do's and Don'ts for investors section required",
      "Securities trading risk disclaimer",
      "SCORES portal link for grievances",
      "Compliance officer details must be listed",
    ],
    complianceChecks: [
      { name: "SEBI INZ Registration", severity: "critical", description: "Registration number in INZ format" },
      { name: "Exchange Membership", severity: "major", description: "NSE/BSE membership details displayed" },
      { name: "Investor Charter", severity: "minor", description: "SEBI-mandated investor charter linked" },
      { name: "Client Fund Segregation", severity: "major", description: "Notice about client fund handling" },
      { name: "Do's and Don'ts", severity: "minor", description: "Investor awareness section" },
      { name: "Trading Risk Disclaimer", severity: "major", description: "Securities market risk disclosure" },
      { name: "Compliance Officer", severity: "major", description: "Compliance officer name and contact" },
      { name: "SCORES Portal", severity: "minor", description: "Link to SEBI SCORES for complaints" },
    ],
    commonIssues: [
      { title: "Missing INZ Registration", description: "SEBI registration in proper INZ format not displayed — the most common broker website violation." },
      { title: "No Investor Charter", description: "SEBI mandates linking the investor charter — most broker sites miss this entirely." },
      { title: "Missing Compliance Officer", description: "SEBI requires compliance officer details to be publicly accessible on the website." },
      { title: "Inadequate Risk Warnings", description: "Trading in securities involves risk — this must be clearly stated, not buried in fine print." },
    ],
    websitePages: ["Home Page", "About Us", "Trading Services", "Account Opening", "Brokerage Plans", "Research & Advisory", "Investor Charter", "Do's & Don'ts", "Contact Us", "Compliance Officer", "Grievance Redressal", "Privacy Policy", "Disclaimer"],
    whyCompliance: "SEBI and stock exchanges conduct regular website audits. Non-compliance can result in trading suspension and heavy penalties.",
  }} />
}
