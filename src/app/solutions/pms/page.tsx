import { SolutionTemplate } from "@/components/solution-template"

export default function PMSPage() {
  return <SolutionTemplate data={{
    type: "PMS", title: "Compliant Websites for Portfolio Managers", subtitle: "SEBI Regulated",
    regulator: "SEBI", iconName: "TrendingUp", color: "bg-violet-600",
    heroDescription: "Portfolio Management Services require detailed disclosures about minimum investment thresholds, fee structures, risk factors, and performance reporting. We build PMS websites that meet every SEBI regulation while presenting your strategies professionally.",
    keyRegulations: [
      "SEBI PMS registration number (INP format) must be displayed",
      "Minimum investment amount of INR 50 lakhs must be disclosed",
      "Fee structure (management + performance fees) must be transparent",
      "Risk factors associated with each strategy must be listed",
      "Past performance with proper disclaimers if shown",
      "Type of PMS (Discretionary/Non-Discretionary) must be clear",
      "No guaranteed or assured returns language",
      "Investor grievance mechanism details",
    ],
    complianceChecks: [
      { name: "SEBI PMS Registration", severity: "critical", description: "INP-format registration number displayed" },
      { name: "Minimum Investment Disclosure", severity: "major", description: "INR 50 lakh minimum clearly stated" },
      { name: "Fee Structure", severity: "major", description: "Management and performance fee details" },
      { name: "Risk Factors", severity: "major", description: "Strategy-specific risk disclosures" },
      { name: "PMS Type", severity: "minor", description: "Discretionary or Non-Discretionary clearly stated" },
      { name: "Track Record Disclosure", severity: "minor", description: "Performance data with proper disclaimers" },
      { name: "Strategy Description", severity: "minor", description: "Investment approach and philosophy" },
      { name: "No Guaranteed Returns", severity: "critical", description: "No assured return promises" },
    ],
    commonIssues: [
      { title: "Missing Minimum Investment", description: "SEBI mandates INR 50 lakh minimum for PMS — this must be prominently displayed." },
      { title: "Fee Ambiguity", description: "Not disclosing the complete fee structure (management fee + performance fee + exit load) is a common gap." },
      { title: "Performance Without Disclaimers", description: "Showing strategy returns without past-performance disclaimers is a serious SEBI violation." },
      { title: "Missing Risk Factors", description: "Each PMS strategy must disclose specific risk factors — concentration risk, liquidity risk, etc." },
    ],
    websitePages: ["Home Page", "About Us", "PMS Strategies", "Performance", "Fee Structure", "Risk Disclosure", "Minimum Investment", "Investor FAQ", "Contact Us", "Grievance Redressal", "Privacy Policy", "Disclaimer"],
    whyCompliance: "SEBI regularly inspects PMS websites and marketing materials. Non-compliance can result in registration cancellation and penalties.",
  }} />
}
