import { SolutionTemplate } from "@/components/solution-template"

export default function MFDPage() {
  return <SolutionTemplate data={{
    type: "MFD", title: "Compliant Websites for Mutual Fund Distributors", subtitle: "SEBI / AMFI Regulated",
    regulator: "SEBI / AMFI", iconName: "BarChart3", color: "bg-blue-600",
    heroDescription: "As an AMFI-registered Mutual Fund Distributor, your website must display ARN numbers, EUIN details, mandatory disclaimers, and scheme-related disclosures. We build websites that meet every SEBI and AMFI requirement while looking professional and converting prospects.",
    keyRegulations: [
      "AMFI ARN number must be prominently displayed on every page",
      "EUIN (Employee Unique Identification Number) display is mandatory",
      "\"Mutual funds are subject to market risks, read all scheme related documents carefully\" disclaimer required",
      "No guaranteed returns or misleading performance claims allowed",
      "Past performance disclaimer must accompany any return data shown",
      "KYC requirements must be mentioned for investor onboarding",
      "Grievance redressal mechanism with SCORES portal reference",
      "SEBI registration number display (if applicable)",
    ],
    complianceChecks: [
      { name: "AMFI ARN Number Display", severity: "critical", description: "ARN-XXXXX must be visible on homepage and footer" },
      { name: "EUIN Display", severity: "major", description: "Employee Unique Identification Number for the distributor" },
      { name: "Mutual Fund Risk Disclaimer", severity: "critical", description: "Standard AMFI disclaimer about market risks" },
      { name: "Scheme Document Advisory", severity: "critical", description: "\"Read all scheme related documents carefully\" notice" },
      { name: "No Guaranteed Returns", severity: "critical", description: "Website must not promise or imply guaranteed returns" },
      { name: "SIP Information", severity: "minor", description: "Systematic Investment Plan details and benefits" },
      { name: "AMFI Website Link", severity: "minor", description: "Link to amfiindia.com for investor reference" },
      { name: "KYC Requirements", severity: "major", description: "Know Your Customer requirements for new investors" },
    ],
    commonIssues: [
      { title: "Missing ARN Number", description: "Most MFD websites fail to display the AMFI ARN prominently. This is the #1 compliance gap we find." },
      { title: "Guaranteed Returns Language", description: "Phrases like 'assured returns' or specific return percentages without proper disclaimers violate SEBI rules." },
      { title: "Missing EUIN", description: "EUIN is often overlooked but is mandatory under AMFI guidelines for all distributor communications." },
      { title: "Outdated Disclaimers", description: "Using old disclaimer formats instead of the current AMFI-prescribed text can be flagged during audits." },
    ],
    websitePages: ["Home Page", "About Us", "Mutual Fund Services", "SIP Calculator", "Investment Planning", "Goal-Based Investing", "Tax Planning (ELSS)", "Contact Us", "Grievance Redressal", "Privacy Policy", "Terms & Conditions", "Disclaimer"],
    whyCompliance: "AMFI conducts regular website audits of registered distributors. Non-compliance can result in ARN suspension and penalties up to INR 25 lakhs.",
  }} />
}
