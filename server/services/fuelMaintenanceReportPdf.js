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
  fixedText(doc, 'TransitLK · Fuel & Maintenance Summary', MARGIN, FOOTER_Y + 14, {
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
    row.forEach((cell, i) => {
      fixedText(doc, String(cell), rx + 6, cy + 5, { fontSize: 9, color: INK, width: colWidths[i] - 12 })
      rx += colWidths[i]
    })
    cy += rowH
  })
  doc.strokeColor(NAVY_LIGHT).lineWidth(0.5).rect(x, y, tableW, cy - y).stroke()
  return cy + 8
}

function renderFuelMaintenancePdf(doc, data) {
  const { period, combined, fuel, maintenance, insights } = data
  const modeLabel = period.mode === 'weekly' ? 'Weekly' : 'Monthly'

  doc.rect(0, 0, PAGE_W, 160).fill(NAVY)
  fixedText(doc, 'TransitLK', MARGIN, 36, { fontSize: 22, bold: true, color: WHITE })
  fixedText(doc, 'Fuel & Maintenance Summary Report', MARGIN, 68, { fontSize: 13, bold: true, color: WHITE })
  fixedText(doc, `${modeLabel} · ${fmtDate(period.from)} – ${fmtDate(period.to)}`, MARGIN, 96, {
    fontSize: 10,
    color: WHITE,
  })
  fixedText(doc, `Generated: ${fmtDate(new Date().toISOString())}`, MARGIN, 118, { fontSize: 9, color: WHITE })

  let y = 180
  const boxW = (CONTENT_W - 12) / 2
  const metrics = [
    ['Total spend', fmtLkr(combined.totalOperationalCost)],
    ['Fuel', `${fmtLkr(fuel.totalCost)} (${combined.fuelSharePct}%)`],
    ['Maintenance', `${fmtLkr(maintenance.totalCost)} (${combined.maintenanceSharePct}%)`],
    ['High-fuel vehicles', String(combined.highFuelVehicleCount)],
  ]
  metrics.forEach(([label, value], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const bx = MARGIN + col * (boxW + 12)
    const by = y + row * 52
    doc.roundedRect(bx, by, boxW, 44, 5).fillAndStroke(NAVY_PANEL, NAVY_LIGHT)
    fixedText(doc, label, bx + 10, by + 8, { fontSize: 8, color: MUTED })
    fixedText(doc, value, bx + 10, by + 22, { fontSize: 11, bold: true, color: NAVY, width: boxW - 20 })
  })
  y += 112

  fixedText(doc, 'Summary', MARGIN, y, { fontSize: 12, bold: true, color: NAVY })
  y += 20
  const summaryLines = [
    `Fuel: ${fuel.totalLiters} L across ${fuel.totalEntries} entries · avg ${fuel.avgLitersPerEntry} L/entry · ${fmtLkr(fuel.avgCostPerLiter)}/L`,
    `Maintenance: ${maintenance.totalEntries} records · ${maintenance.vehiclesServiced} vehicle(s) serviced`,
  ]
  summaryLines.forEach((line) => {
    fixedText(doc, line, MARGIN, y, { fontSize: 9, color: INK, width: CONTENT_W })
    y += 16
  })
  y += 8

  if (insights?.length) {
    fixedText(doc, 'Insights', MARGIN, y, { fontSize: 12, bold: true, color: NAVY })
    y += 18
    for (const insight of insights.slice(0, 5)) {
      doc.roundedRect(MARGIN, y, CONTENT_W, 32, 4).fillAndStroke(NAVY_PANEL, NAVY_LIGHT)
      fixedText(doc, insight.text, MARGIN + 10, y + 10, { fontSize: 9, color: INK, width: CONTENT_W - 20 })
      y += 38
      if (y > CONTENT_BOTTOM - 80) break
    }
  }

  if (fuel.byVehicle?.length && y < CONTENT_BOTTOM - 60) {
    fixedText(doc, 'Fuel by vehicle', MARGIN, y, { fontSize: 10, bold: true, color: NAVY })
    y += 14
    y = drawTable(
      doc,
      MARGIN,
      y,
      [120, 80, 100, 80, CONTENT_W - 380],
      ['Vehicle', 'Liters', 'Cost', 'Entries', 'Avg/entry'],
      fuel.byVehicle.slice(0, 8).map((v) => [
        v.regNumber,
        `${v.liters} L`,
        fmtLkr(v.amount),
        String(v.entries),
        v.avgLitersPerEntry != null ? `${v.avgLitersPerEntry} L` : '—',
      ])
    )
  }

  if (maintenance.byServiceType?.length && y < CONTENT_BOTTOM - 60) {
    fixedText(doc, 'Maintenance by service type', MARGIN, y, { fontSize: 10, bold: true, color: NAVY })
    y += 14
    y = drawTable(
      doc,
      MARGIN,
      y,
      [CONTENT_W * 0.5, CONTENT_W * 0.2, CONTENT_W * 0.3],
      ['Service type', 'Count', 'Cost'],
      maintenance.byServiceType.slice(0, 8).map((r) => [r.type, String(r.count), fmtLkr(r.cost)])
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
