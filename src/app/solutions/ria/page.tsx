import { SolutionTemplate } from "@/components/solution-template"

export default function RIAPage() {
  return <SolutionTemplate data={{
    type: "RIA", title: "Compliant Websites for Registered Investment Advisers", subtitle: "SEBI Regulated",
    regulator: "SEBI", iconName: "FileCheck", color: "bg-sky-600",
    heroDescription: "As a SEBI-registered Investment Adviser, your website carries fiduciary responsibility. We build websites that clearly distinguish advisory from distribution, display all required registrations, and maintain BASL compliance.",
    keyRegulations: [
      "SEBI RIA registration number (INA format) must be displayed",
      "BASL membership details are mandatory",
      "Fee structure (fee-only or fee-based) must be clearly disclosed",
      "Fiduciary duty statement recommended",
      "SIDD compliance if also holding MFD/distribution license",
      "Risk profiling methodology should be explained",
      "No guaranteed return promises — advisory is opinion-based",
      "Client grievance mechanism with SCORES portal link",
    ],
    complianceChecks: [
      { name: "SEBI RIA Registration", severity: "critical", description: "INA-format registration number displayed" },
      { name: "BASL Membership", severity: "major", description: "BSE Administration and Supervision Ltd membership" },
      { name: "Fee Structure Disclosure", severity: "major", description: "Fee-only or fee-based model clearly stated" },
      { name: "Fiduciary Duty Statement", severity: "minor", description: "Declaration of fiduciary responsibility" },
      { name: "SIDD Compliance", severity: "critical", description: "Segregation of advisory and distribution activities" },
      { name: "Risk Profiling", severity: "minor", description: "Risk assessment methodology explained" },
      { name: "Investment Risk Disclaimer", severity: "critical", description: "Standard investment risk disclosure" },
      { name: "SCORES Portal Link", severity: "minor", description: "Link to SEBI SCORES for grievances" },
    ],
    commonIssues: [
      { title: "Missing BASL Details", description: "Many RIAs forget to display BASL membership, which is mandatory for all SEBI-registered advisers." },
      { title: "Fee Opacity", description: "Not clearly stating whether you're fee-only or fee-based leads to compliance flags and client confusion." },
      { title: "SIDD Non-compliance", description: "If you hold both RIA and MFD licenses, failing to segregate activities on your website is a serious violation." },
      { title: "Performance Promises", description: "Showing model portfolio returns without proper past-performance disclaimers violates SEBI guidelines." },
    ],
    websitePages: ["Home Page", "About Us", "Advisory Services", "Financial Planning", "Risk Assessment", "Fee Structure", "Client Onboarding", "Contact Us", "Grievance Redressal", "Privacy Policy", "Terms & Conditions", "Disclaimer"],
    whyCompliance: "SEBI conducts periodic inspections of RIA websites. BASL also monitors member compliance. Non-compliance can lead to registration cancellation.",
  }} />
}
