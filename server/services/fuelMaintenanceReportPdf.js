import PDFDocument from 'pdfkit'

const NAVY = '#1e3a8a'
const NAVY_LIGHT = '#4a6fd4'
const NAVY_PANEL = '#eef2fb'
const INK = '#1a1d26'
const MUTED = '#5c6370'
const WHITE = '#ffffff'
const PAGE_W = 595.28
const PAGE_H = 842
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_Y = PAGE_H - 56
const CONTENT_BOTTOM = FOOTER_Y - 16

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtLkr(n) {
  return `LKR ${Math.round(Number(n || 0)).toLocaleString()}`
}

function fixedText(doc, text, x, y, opts = {}) {
  const { width, fontSize = 9, color = INK, bold = false, align } = opts
  doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize)
  const tOpts = { lineBreak: false }
  if (width != null) tOpts.width = width
  if (align) tOpts.align = align
  doc.text(String(text), x, y, tOpts)
  doc.x = x
  doc.y = y
}

function drawFooter(doc, pageNum) {
  doc.save()
  doc.rect(0, FOOTER_Y, PAGE_W, PAGE_H - FOOTER_Y).fill(NAVY)
  fixedText(doc, 'TransitLK · Fuel & Maintenance Report', MARGIN, FOOTER_Y + 14, {
    width: CONTENT_W,
    align: 'center',
    color: WHITE,
    fontSize: 7,
  })
  fixedText(doc, `Page ${pageNum}`, MARGIN, FOOTER_Y + 14, {
    width: CONTENT_W,
    align: 'right',
    color: WHITE,
    fontSize: 7,
  })
  doc.restore()
}

function drawTable(doc, x, y, colWidths, headers, rows) {
  const rowH = 20
  const tableW = colWidths.reduce((a, b) => a + b, 0)
  let cy = y
  doc.rect(x, cy, tableW, rowH).fill(NAVY)
  let hx = x
  headers.forEach((h, i) => {
    fixedText(doc, h, hx + 6, cy + 6, { fontSize: 8, bold: true, color: WHITE, width: colWidths[i] - 12 })
    hx += colWidths[i]
  })
  cy += rowH
  rows.forEach((row, ri) => {
    if (ri % 2 === 0) doc.fillColor(NAVY_PANEL).rect(x, cy, tableW, rowH).fill()
    let rx = x
    row.forEach((cellVal, i) => {
      fixedText(doc, String(cellVal), rx + 6, cy + 5, { fontSize: 9, color: INK, width: colWidths[i] - 12 })
      rx += colWidths[i]
    })
    cy += rowH
  })
  doc.strokeColor(NAVY_LIGHT).lineWidth(0.5).rect(x, y, tableW, cy - y).stroke()
  return cy + 8
}

function renderFuelMaintenancePdf(doc, data) {
  const { period, combined, fuel, maintenance, insights, vehiclesOfConcern } = data
  const modeLabel = period.mode === 'weekly' ? 'Weekly' : 'Monthly'
  const concernRows = vehiclesOfConcern || fuel.byVehicle?.filter((v) => v.highUsage) || []

  doc.rect(0, 0, PAGE_W, 160).fill(NAVY)
  fixedText(doc, 'TransitLK', MARGIN, 36, { fontSize: 22, bold: true, color: WHITE })
  fixedText(doc, 'Fuel & Maintenance Report', MARGIN, 68, { fontSize: 13, bold: true, color: WHITE })
  fixedText(doc, `${modeLabel} · ${fmtDate(period.from)} – ${fmtDate(period.to)}`, MARGIN, 96, {
    fontSize: 10,
    color: WHITE,
  })
  fixedText(doc, `Generated: ${fmtDate(new Date().toISOString())}`, MARGIN, 118, { fontSize: 9, color: WHITE })

  let y = 180
  doc.roundedRect(MARGIN, y, CONTENT_W, 52, 5).fillAndStroke(NAVY_PANEL, NAVY_LIGHT)
  fixedText(doc, 'Period overview', MARGIN + 12, y + 10, { fontSize: 8, color: MUTED, bold: true })
  fixedText(
    doc,
    `Operational spend ${fmtLkr(combined.totalOperationalCost)} · fuel ${combined.fuelSharePct}% · maintenance ${combined.maintenanceSharePct}% · ${combined.highFuelVehicleCount} high-fuel vehicle(s)`,
    MARGIN + 12,
    y + 26,
    { fontSize: 10, bold: true, color: NAVY, width: CONTENT_W - 24 }
  )
  y += 68

  if (insights?.length) {
    fixedText(doc, 'Findings & recommendations', MARGIN, y, { fontSize: 12, bold: true, color: NAVY })
    y += 18
    for (const insight of insights.slice(0, 6)) {
      doc.roundedRect(MARGIN, y, CONTENT_W, 32, 4).fillAndStroke(NAVY_PANEL, NAVY_LIGHT)
      fixedText(doc, insight.text, MARGIN + 10, y + 10, { fontSize: 9, color: INK, width: CONTENT_W - 20 })
      y += 38
      if (y > CONTENT_BOTTOM - 80) break
    }
    y += 4
  }

  if (fuel.trend?.length && y < CONTENT_BOTTOM - 60) {
    fixedText(doc, period.mode === 'weekly' ? 'Daily fuel trend' : 'Weekly fuel trend', MARGIN, y, {
      fontSize: 10,
      bold: true,
      color: NAVY,
    })
    y += 14
    y = drawTable(
      doc,
      MARGIN,
      y,
      [120, 120, CONTENT_W - 240],
      ['Period', 'Liters', 'Cost (LKR)'],
      fuel.trend.map((t) => [t.label, `${t.liters} L`, fmtLkr(t.cost)])
    )
  }

  if (maintenance.trend?.length && y < CONTENT_BOTTOM - 60) {
    fixedText(doc, period.mode === 'weekly' ? 'Daily maintenance cost' : 'Weekly maintenance cost', MARGIN, y, {
      fontSize: 10,
      bold: true,
      color: NAVY,
    })
    y += 14
    y = drawTable(
      doc,
      MARGIN,
      y,
      [180, CONTENT_W - 180],
      ['Period', 'Cost (LKR)'],
      maintenance.trend.map((t) => [t.label, fmtLkr(t.cost)])
    )
  }

  if (concernRows.length > 0 && y < CONTENT_BOTTOM - 60) {
    fixedText(doc, 'Vehicles requiring attention', MARGIN, y, { fontSize: 10, bold: true, color: NAVY })
    y += 14
    y = drawTable(
      doc,
      MARGIN,
      y,
      [140, 100, CONTENT_W - 240],
      ['Vehicle', 'Liters', 'Fleet share'],
      concernRows.map((v) => [v.regNumber, `${v.liters} L`, `${v.fuelShare ?? 0}%`])
    )
  }

  if (maintenance.byServiceType?.length && y < CONTENT_BOTTOM - 60) {
    fixedText(doc, 'Maintenance cost breakdown', MARGIN, y, { fontSize: 10, bold: true, color: NAVY })
    y += 14
    y = drawTable(
      doc,
      MARGIN,
      y,
      [CONTENT_W * 0.5, CONTENT_W * 0.2, CONTENT_W * 0.3],
      ['Service type', 'Count', 'Cost'],
      maintenance.byServiceType.slice(0, 5).map((r) => [r.type, String(r.count), fmtLkr(r.cost)])
    )
  }

  drawFooter(doc, 1)
}

export function createFuelMaintenanceReportPdfStream(data) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: true,
  })
  renderFuelMaintenancePdf(doc, data)
  doc.end()
  return doc
}
