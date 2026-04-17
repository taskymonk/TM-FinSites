import jsPDF from "jspdf"

interface AuditData {
  url: string
  overall_score: number
  detected_business_types: string[]
  total_rules: number
  passed_rules: number
  failed_rules: number
  critical_failures: number
  major_failures: number
  minor_failures: number
  categories: Record<string, { passed: number; total: number; score: number }>
  results: Array<{ rule_id: string; name: string; category: string; severity: string; passed: boolean; details: string }>
  scanned_at: string
}

export function generateAuditPDF(data: AuditData) {
  const doc = new jsPDF()
  const w = doc.internal.pageSize.getWidth()
  let y = 20

  function addPage() { doc.addPage(); y = 20 }
  function checkPage(needed: number) { if (y + needed > 275) addPage() }

  // Header
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.text("FinSites", 14, y)
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text("Compliance Audit Report", 14, y + 7)
  doc.setDrawColor(37, 99, 235)
  doc.setLineWidth(0.5)
  doc.line(14, y + 12, w - 14, y + 12)
  y += 22

  // URL & Date
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`URL: ${data.url}`, 14, y)
  doc.text(`Date: ${new Date(data.scanned_at).toLocaleString()}`, 14, y + 5)
  doc.text(`Business Types: ${data.detected_business_types.join(", ") || "None detected"}`, 14, y + 10)
  y += 20

  // Score
  doc.setFontSize(36)
  doc.setFont("helvetica", "bold")
  const scoreColor = data.overall_score >= 80 ? [16, 185, 129] : data.overall_score >= 50 ? [245, 158, 11] : [239, 68, 68]
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
  doc.text(`${data.overall_score}`, 14, y + 2)
  doc.setFontSize(14)
  doc.setTextColor(100, 116, 139)
  doc.text("/ 100", 42, y + 2)
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text("Overall Compliance Score", 70, y - 2)
  y += 8

  // Stats
  doc.setFontSize(9)
  const stats = [
    { label: "Total Rules", value: data.total_rules.toString(), color: [100, 116, 139] },
    { label: "Passed", value: data.passed_rules.toString(), color: [16, 185, 129] },
    { label: "Failed", value: data.failed_rules.toString(), color: [239, 68, 68] },
    { label: "Critical", value: data.critical_failures.toString(), color: [239, 68, 68] },
    { label: "Major", value: data.major_failures.toString(), color: [245, 158, 11] },
    { label: "Minor", value: data.minor_failures.toString(), color: [59, 130, 246] },
  ]
  let sx = 70
  for (const s of stats) {
    doc.setTextColor(s.color[0], s.color[1], s.color[2])
    doc.setFont("helvetica", "bold")
    doc.text(s.value, sx, y)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139)
    doc.text(` ${s.label}`, sx + doc.getTextWidth(s.value), y)
    sx += 28
  }
  y += 15

  // Categories
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 41, 59)
  doc.text("Category Breakdown", 14, y)
  y += 8

  for (const [cat, info] of Object.entries(data.categories)) {
    checkPage(10)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(30, 41, 59)
    doc.text(cat, 14, y)
    const cColor = info.score >= 80 ? [16, 185, 129] : info.score >= 50 ? [245, 158, 11] : [239, 68, 68]
    doc.setTextColor(cColor[0], cColor[1], cColor[2])
    doc.setFont("helvetica", "bold")
    doc.text(`${info.score}%`, w - 35, y)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139)
    doc.text(`${info.passed}/${info.total} passed`, w - 14 - doc.getTextWidth(`${info.passed}/${info.total} passed`), y)
    // Progress bar
    doc.setFillColor(226, 232, 240)
    doc.rect(14, y + 2, w - 28, 2, "F")
    doc.setFillColor(cColor[0], cColor[1], cColor[2])
    doc.rect(14, y + 2, (w - 28) * (info.score / 100), 2, "F")
    y += 10
  }
  y += 5

  // Failed Rules
  const failed = data.results.filter((r) => !r.passed)
  if (failed.length > 0) {
    checkPage(15)
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(239, 68, 68)
    doc.text(`Failed Checks (${failed.length})`, 14, y)
    y += 8

    for (const rule of failed) {
      checkPage(14)
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      const sevColor = rule.severity === "critical" ? [239, 68, 68] : rule.severity === "major" ? [245, 158, 11] : [59, 130, 246]
      doc.text(`[${rule.severity.toUpperCase()}]`, 14, y)
      doc.setTextColor(30, 41, 59)
      doc.text(rule.name, 14 + doc.getTextWidth(`[${rule.severity.toUpperCase()}] `), y)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      const detail = doc.splitTextToSize(rule.details, w - 28)
      doc.text(detail, 14, y + 4)
      y += 4 + detail.length * 4 + 3
    }
  }

  // Passed Rules
  const passed = data.results.filter((r) => r.passed)
  if (passed.length > 0) {
    checkPage(15)
    y += 5
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(16, 185, 129)
    doc.text(`Passed Checks (${passed.length})`, 14, y)
    y += 8

    for (const rule of passed) {
      checkPage(10)
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(16, 185, 129)
      doc.text(`\u2713`, 14, y)
      doc.setTextColor(100, 116, 139)
      doc.text(`${rule.name} — ${rule.details}`, 20, y)
      y += 5
    }
  }

  // Footer on last page
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text("Generated by FinSites Compliance Audit Engine | finsites.in", 14, 288)
  doc.text(`Report ID: ${data.url.replace(/[^a-z0-9]/gi, "_").slice(0, 30)}`, w - 14 - doc.getTextWidth(`Report ID: ${data.url.replace(/[^a-z0-9]/gi, "_").slice(0, 30)}`), 288)

  doc.save(`compliance-audit-${new URL(data.url).hostname}.pdf`)
}
