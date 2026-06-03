import PDFDocument from 'pdfkit'

/** Same as app header — depot-navy / --fleet-primary */
const NAVY = '#1e3a8a'
const NAVY_LIGHT = '#4a6fd4'
const NAVY_PANEL = '#eef2fb'
const INK = '#1a1d26'
const MUTED = '#5c6370'
const LINE = '#c5d0e6'
const WHITE = '#ffffff'

const PAGE_W = 595.28
const PAGE_H = 842
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_Y = PAGE_H - 56
const CONTENT_BOTTOM = FOOTER_Y - 16

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, info: 3 }

function formatShortDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatGeneratedAt(iso) {
  return new Date(iso || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function periodTitle(mode) {
  return mode === 'weekly' ? 'WEEKLY OPERATIONS REPORT' : 'MONTHLY OPERATIONS REPORT'
}

/** Reset PDFKit flow cursor so it does not auto-insert blank pages. @param {import('pdfkit').PDFDocument} doc */
function resetCursor(doc, x, y) {
  doc.x = x
  doc.y = y
}

/**
 * Draw text at fixed (x,y) — never triggers PDFKit auto page breaks.
 * @param {import('pdfkit').PDFDocument} doc
 */
function fixedText(doc, text, x, y, options = {}) {
  const {
    width,
    height,
    font = 'Helvetica',
    fontSize = 9,
    color = INK,
    bold = false,
    align,
  } = options
  doc.fillColor(color).font(bold ? 'Helvetica-Bold' : font).fontSize(fontSize)
  const opts = { lineBreak: false }
  if (width != null) opts.width = width
  if (height != null) opts.height = height
  if (align) opts.align = align
  doc.text(String(text), x, y, opts)
  resetCursor(doc, x, y)
}

/**
 * @param {import('pdfkit').PDFDocument} doc
 */
function wrapToLines(doc, text, width, fontSize = 9, maxLines = 3) {
  doc.font('Helvetica').fontSize(fontSize)
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word
    if (doc.widthOfString(next) > width && cur) {
      lines.push(cur)
      cur = word
      if (lines.length >= maxLines) break
    } else {
      cur = next
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  if (lines.length === maxLines && words.length > 0) {
    const last = lines[maxLines - 1]
    if (last.length > 3 && !last.endsWith('…')) lines[maxLines - 1] = `${last.slice(0, -1)}…`
  }
  return lines
}

function lineBlockHeight(lineCount, fontSize = 9) {
  return lineCount * (fontSize + 3) + 4
}

/**
 * @param {import('pdfkit').PDFDocument} doc
 */
function nextPage(doc, pageNumRef) {
  drawPageFooter(doc, pageNumRef.current)
  doc.addPage()
  pageNumRef.current += 1
  drawContinuationHeader(doc)
  resetCursor(doc, MARGIN, 52)
  return 52
}

/**
 * Advance y if block does not fit; returns new y (top of block).
 * @param {import('pdfkit').PDFDocument} doc
 */
function fitBlock(doc, y, blockHeight, pageNumRef) {
  if (blockHeight <= 0) return y
  if (y + blockHeight <= CONTENT_BOTTOM) return y
  return nextPage(doc, pageNumRef)
}

/** @param {import('pdfkit').PDFDocument} doc */
function drawContinuationHeader(doc) {
  doc.save()
  doc.rect(0, 0, PAGE_W, 36).fill(NAVY)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10)
  fixedText(doc, 'TransitLK · Operations Report', MARGIN, 12, { bold: true, color: WHITE })
  doc.restore()
}

/** @param {import('pdfkit').PDFDocument} doc */
function drawPageFooter(doc, pageNum) {
  doc.save()
  doc.rect(0, FOOTER_Y, PAGE_W, PAGE_H - FOOTER_Y).fill(NAVY)
  doc.fillColor(WHITE).font('Helvetica').fontSize(7)
  fixedText(doc, 'TransitLK SRMSS · Smart Route Management & Scheduling', MARGIN, FOOTER_Y + 10, {
    width: CONTENT_W,
    align: 'center',
    color: WHITE,
  })
  fixedText(doc, 'Generated automatically', MARGIN, FOOTER_Y + 20, {
    width: CONTENT_W,
    align: 'center',
    color: WHITE,
  })
  fixedText(doc, `Page ${pageNum}`, MARGIN, FOOTER_Y + 10, {
    width: CONTENT_W,
    align: 'right',
    color: WHITE,
  })
  doc.restore()
}

/** @param {import('pdfkit').PDFDocument} doc */
function drawCoverHeader(doc, { periodMode, from, to, generatedAt, depotLabel }) {
  doc.save()
  doc.rect(0, 0, PAGE_W, 188).fill(NAVY)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(22)
  fixedText(doc, 'TransitLK', MARGIN, 40, { bold: true, color: WHITE })
  fixedText(doc, 'Smart Route Management & Scheduling System', MARGIN, 66, {
    fontSize: 10,
    color: WHITE,
  })
  fixedText(doc, periodTitle(periodMode), MARGIN, 92, { fontSize: 13, bold: true, color: WHITE })
  fixedText(doc, `Period:  ${formatShortDate(from)}  –  ${formatShortDate(to)}`, MARGIN, 122, {
    fontSize: 10,
    color: WHITE,
  })
  fixedText(doc, `Generated:  ${formatGeneratedAt(generatedAt)}`, MARGIN, 138, {
    fontSize: 10,
    color: WHITE,
  })
  fixedText(doc, `Depot:  ${depotLabel}`, MARGIN, 154, { fontSize: 10, color: WHITE })
  doc.restore()
  return 204
}

/** @param {import('pdfkit').PDFDocument} doc */
function drawSectionTitle(doc, y, title) {
  fixedText(doc, title, MARGIN, y, { fontSize: 12, bold: true, color: NAVY })
  doc.rect(MARGIN, y + 16, 48, 3).fill(NAVY)
  return y + 28
}

/** @param {import('pdfkit').PDFDocument} doc */
function drawMetricBox(doc, x, y, w, h, label, value, pageNumRef) {
  let top = y
  if (pageNumRef) top = fitBlock(doc, y, h, pageNumRef)
  y = top
  doc.save()
  doc.roundedRect(x, y, w, h, 5).fillAndStroke(NAVY_PANEL, NAVY)
  fixedText(doc, label, x + 10, y + 8, { fontSize: 8, color: MUTED, width: w - 20 })
  fixedText(doc, value, x + 10, y + 22, { fontSize: 14, bold: true, color: NAVY, width: w - 20 })
  doc.restore()
  return y + h
}

/** @param {import('pdfkit').PDFDocument} doc */
function drawHorizontalBars(doc, x, y, width, items, pageNumRef) {
  const blockH = items.length * 22 + 6
  y = fitBlock(doc, y, blockH, pageNumRef)
  const max = Math.max(...items.map((i) => i.value), 1)
  const labelW = 72
  const barMaxW = width - labelW - 40
  let cy = y

  for (const item of items) {
    const barW = Math.max((item.value / max) * barMaxW, item.value > 0 ? 4 : 0)
    fixedText(doc, item.label, x, cy + 2, { fontSize: 9, color: MUTED, width: labelW })
    doc.fillColor(item.color).roundedRect(x + labelW, cy, barW, 12, 2).fill()
    fixedText(doc, String(item.value), x + labelW + barW + 6, cy + 2, {
      fontSize: 9,
      bold: true,
      color: NAVY,
    })
    cy += 22
  }
  return cy + 4
}

/** @param {import('pdfkit').PDFDocument} doc */
function drawSimpleTable(doc, x, y, colWidths, headers, rows, pageNumRef) {
  const rowH = 20
  const tableH = rowH * (1 + rows.length) + 6
  y = fitBlock(doc, y, tableH, pageNumRef)
  const tableW = colWidths.reduce((a, b) => a + b, 0)
  let cy = y

  doc.save()
  doc.rect(x, cy, tableW, rowH).fill(NAVY)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8)
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
      fixedText(doc, String(cell), rx + 6, cy + 5, {
        fontSize: 9,
        color: INK,
        width: colWidths[i] - 12,
      })
      rx += colWidths[i]
    })
    cy += rowH
  })

  doc.strokeColor(NAVY_LIGHT).lineWidth(0.5).rect(x, y, tableW, tableH - 6).stroke()
  doc.restore()
  return y + tableH
}

/** @param {import('pdfkit').PDFDocument} doc */
function drawHighlightRow(doc, x, y, w, label, value, pageNumRef, accent = NAVY, { skipFit = false } = {}) {
  if (!skipFit && pageNumRef) y = fitBlock(doc, y, 38, pageNumRef)
  doc.save()
  doc.roundedRect(x, y, w, 38, 4).fillAndStroke(NAVY_PANEL, NAVY_LIGHT)
  doc.rect(x, y, 4, 38).fill(accent)
  fixedText(doc, label, x + 12, y + 6, { fontSize: 8, color: MUTED })
  fixedText(doc, value, x + 12, y + 20, { fontSize: 9, bold: true, color: NAVY, width: w - 20 })
  doc.restore()
  return y + 44
}

/** Line-by-line text — avoids PDFKit auto page insertion. @param {import('pdfkit').PDFDocument} doc */
function drawWrappedBlock(doc, x, y, width, text, pageNumRef, fontSize = 9, maxLines = 3) {
  const lines = wrapToLines(doc, text, width, fontSize, maxLines)
  const h = lineBlockHeight(lines.length, fontSize)
  y = fitBlock(doc, y, h, pageNumRef)
  const lineH = fontSize + 3
  lines.forEach((line, i) => {
    fixedText(doc, line, x, y + i * lineH, { fontSize, color: INK, width })
  })
  return y + h
}

function buildInsightBullets(data) {
  const bullets = []
  const ins = data.operationalInsights || {}
  const fleet = ins.fleetUtilization || {}

  if ((fleet.busesTotal ?? 0) > 0) {
    const healthy = fleet.rate >= 65
    bullets.push(
      healthy
        ? `Fleet utilization is healthy (${fleet.rate}%).`
        : `Fleet utilization is ${fleet.rate}% (${fleet.busesUsed}/${fleet.busesTotal} buses).`
    )
  }
  if (ins.bestPerformingRoute) {
    bullets.push(
      `${ins.bestPerformingRoute.routeName} is the best-performing route (${ins.bestPerformingRoute.completionRate}%).`
    )
  }
  if (ins.highestFuelConsumingRoute?.liters > 0) {
    bullets.push(
      `Highest fuel: ${ins.highestFuelConsumingRoute.routeName} (${ins.highestFuelConsumingRoute.liters} L).`
    )
  }
  const atRisk = (data.monthlySummary || []).filter((r) => r.status === 'AT RISK').length
  if (atRisk > 0) {
    bullets.push(`${atRisk} route(s) need review due to delays or low completion.`)
  } else if (ins.worstPerformingRoute?.delayed > 0) {
    bullets.push(`${ins.worstPerformingRoute.routeName} has ${ins.worstPerformingRoute.delayed} delayed trip(s).`)
  }
  if (!data.hasData) {
    return ['No data in this period — add schedules and fuel logs first.']
  }
  if (!bullets.length) bullets.push('Operations are within normal thresholds for this period.')
  return bullets.slice(0, 4)
}

function pickRecommendations(data, limit = 4) {
  const list = [...(data.operationalInsights?.recommendations || [])]
  list.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
  return list.slice(0, limit)
}

/**
 * @param {import('pdfkit').PDFDocument} doc
 */
export function renderOperationsReportPdf(doc, data, meta = {}) {
  const pageNum = { current: 1 }
  const summary = data.summary || {}
  const breakdown = data.scheduleBreakdown || {}
  const fuel = data.fuel || {}
  const kpis = data.operationalKpis || {}
  const insights = data.operationalInsights || {}
  const period = data.period || {}

  let y = drawCoverHeader(doc, {
    periodMode: period.mode,
    from: period.from,
    to: period.to,
    generatedAt: data.autoReport?.generatedAt,
    depotLabel: meta.depotLabel || '—',
  })

  if (!data.hasData) {
    y = fitBlock(doc, y, 60, pageNum)
    y = drawSectionTitle(doc, y, 'Report status')
    y = drawWrappedBlock(
      doc,
      MARGIN,
      y,
      CONTENT_W,
      'No operational records for this date range. Create schedules and fuel logs, then export again.',
      pageNum
    )
    drawPageFooter(doc, pageNum.current)
    return
  }

  // Executive Summary
  y = fitBlock(doc, y, 32, pageNum)
  y = drawSectionTitle(doc, y, 'Executive Summary')
  const boxW = (CONTENT_W - 10) / 2
  const boxH = 48
  const execTop = fitBlock(doc, y, boxH, pageNum)
  drawMetricBox(doc, MARGIN, execTop, boxW, boxH, 'Total trips', summary.totalTrips ?? 0, null)
  drawMetricBox(
    doc,
    MARGIN + boxW + 10,
    execTop,
    boxW,
    boxH,
    'Completed trips',
    summary.completedTrips ?? 0,
    null
  )
  const execTop2 = fitBlock(doc, execTop + boxH + 8, boxH, pageNum)
  drawMetricBox(
    doc,
    MARGIN,
    execTop2,
    boxW,
    boxH,
    'Completion rate',
    `${summary.tripCompletionRate ?? 0}%`,
    null
  )
  drawMetricBox(doc, MARGIN + boxW + 10, execTop2, boxW, boxH, 'Fuel consumed', `${fuel.totalLiters ?? 0} L`, null)
  y = execTop2 + boxH + 10
  y = drawMetricBox(
    doc,
    MARGIN,
    y,
    CONTENT_W,
    40,
    'Fleet utilization',
    `${summary.vehicleUtilizationRate ?? kpis.vehicleUtilizationRate ?? 0}%`,
    pageNum
  )

  // Trip Completion
  y = fitBlock(doc, y + 10, 32, pageNum)
  y = drawSectionTitle(doc, y, 'Trip Completion Analysis')
  const tripRows = [
    ['Scheduled trips', String(summary.activeTrips ?? summary.totalTrips ?? 0)],
    ['Completed trips', String(summary.completedTrips ?? 0)],
    ['Delayed trips', String(summary.delayedTrips ?? 0)],
    ['Cancelled trips', String(summary.cancelledTrips ?? 0)],
    ['Completion rate', `${summary.tripCompletionRate ?? data.tripCompletion?.rate ?? 0}%`],
  ]
  y = drawSimpleTable(doc, MARGIN, y, [188, CONTENT_W - 188], ['Metric', 'Value'], tripRows, pageNum)
  y = drawHorizontalBars(
    doc,
    MARGIN,
    y + 4,
    CONTENT_W,
    [
      { label: 'Completed', value: breakdown.completed ?? summary.completedTrips ?? 0, color: NAVY },
      { label: 'Delayed', value: breakdown.delayed ?? summary.delayedTrips ?? 0, color: NAVY_LIGHT },
      { label: 'Cancelled', value: breakdown.cancelled ?? summary.cancelledTrips ?? 0, color: '#94a3b8' },
    ],
    pageNum
  )

  // Route Performance
  y = fitBlock(doc, y + 10, 32, pageNum)
  y = drawSectionTitle(doc, y, 'Route Performance')
  const best = insights.bestPerformingRoute
  const worst = insights.worstPerformingRoute
  const mostDelayed = (insights.routeDelayAnalysis || [])[0]
  const atRiskCount = (data.monthlySummary || []).filter((r) => r.status === 'AT RISK').length
  const halfW = (CONTENT_W - 8) / 2

  if (best || worst) {
    const pairY = fitBlock(doc, y, 44, pageNum)
    if (best) {
      drawHighlightRow(
        doc,
        MARGIN,
        pairY,
        halfW,
        'Best route',
        `${best.routeName} · ${best.completionRate}%`,
        pageNum,
        NAVY,
        { skipFit: true }
      )
    }
    if (worst) {
      drawHighlightRow(
        doc,
        best ? MARGIN + halfW + 8 : MARGIN,
        pairY,
        best ? halfW : CONTENT_W,
        'Lowest completion',
        `${worst.routeName} · ${worst.completionRate}%`,
        pageNum,
        NAVY_LIGHT,
        { skipFit: true }
      )
    }
    y = pairY + 44
  }

  if (mostDelayed) {
    y = drawHighlightRow(
      doc,
      MARGIN,
      y,
      CONTENT_W,
      'Most delayed route',
      `${mostDelayed.routeName} · ${mostDelayed.delayed} delayed`,
      pageNum
    )
  }

  y = drawHighlightRow(
    doc,
    MARGIN,
    y,
    CONTENT_W,
    'Routes at risk',
    atRiskCount === 0 ? 'None' : `${atRiskCount} route(s)`,
    pageNum,
    atRiskCount > 0 ? '#dc2626' : NAVY
  )

  const routeTableRows = (data.monthlySummary || [])
    .slice(0, 5)
    .map((r) => [r.depotUnit, `${r.completionRate}%`, r.incidentsLabel || '0'])
  if (routeTableRows.length > 0) {
    y = drawSimpleTable(
      doc,
      MARGIN,
      y + 4,
      [CONTENT_W * 0.52, CONTENT_W * 0.2, CONTENT_W * 0.28],
      ['Route', 'Completion', 'Incidents'],
      routeTableRows,
      pageNum
    )
  }

  // Fuel
  y = fitBlock(doc, y + 8, 84, pageNum)
  y = drawSectionTitle(doc, y, 'Fuel Consumption Analysis')
  const fuelBoxW = (CONTENT_W - 20) / 3
  const fuelTop = y
  drawMetricBox(doc, MARGIN, fuelTop, fuelBoxW, 44, 'Total fuel', `${fuel.totalLiters ?? 0} L`, null)
  drawMetricBox(
    doc,
    MARGIN + fuelBoxW + 10,
    fuelTop,
    fuelBoxW,
    44,
    'Avg / completed trip',
    (kpis.litersPerCompletedTrip ?? 0) > 0 ? `${kpis.litersPerCompletedTrip} L` : '—',
    null
  )
  drawMetricBox(
    doc,
    MARGIN + (fuelBoxW + 10) * 2,
    fuelTop,
    fuelBoxW,
    44,
    'Fuel cost',
    `LKR ${(fuel.totalCost ?? 0).toLocaleString('en-LK')}`,
    null
  )
  y = fuelTop + 52

  const topFuel = insights.highestFuelConsumingRoute
  if (topFuel) {
    y = drawHighlightRow(
      doc,
      MARGIN,
      y,
      CONTENT_W,
      'Highest fuel route',
      `${topFuel.routeName} · ${topFuel.liters} L`,
      pageNum
    )
  }

  const fuelBars = (fuel.byRoute || []).slice(0, 4)
  if (fuelBars.length > 0) {
    y = drawHorizontalBars(
      doc,
      MARGIN,
      y,
      CONTENT_W,
      fuelBars.map((r) => ({
        label: r.routeName.length > 12 ? `${r.routeName.slice(0, 11)}…` : r.routeName,
        value: r.liters,
        color: NAVY,
      })),
      pageNum
    )
  }

  // Operational Insights
  y = fitBlock(doc, y + 10, 32, pageNum)
  y = drawSectionTitle(doc, y, 'Operational Insights')
  fixedText(doc, 'Important · Data-driven summary', MARGIN, y, { fontSize: 8, color: MUTED })
  y += 14

  for (const line of buildInsightBullets(data)) {
    const textW = CONTENT_W - 36
    const lines = wrapToLines(doc, line, textW, 9, 2)
    const boxH = Math.max(24, lineBlockHeight(lines.length, 9) + 8)
    y = fitBlock(doc, y, boxH + 4, pageNum)
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 4).fillAndStroke(NAVY_PANEL, NAVY_LIGHT)
    fixedText(doc, '✓', MARGIN + 8, y + 6, { fontSize: 10, bold: true, color: NAVY })
    const lineH = 12
    lines.forEach((ln, i) => {
      fixedText(doc, ln, MARGIN + 24, y + 6 + i * lineH, { fontSize: 9, color: INK, width: textW })
    })
    y += boxH + 6
  }

  // Recommendations
  const recs = pickRecommendations(data)
  y = fitBlock(doc, y + 8, 32, pageNum)
  y = drawSectionTitle(doc, y, 'Recommendations')
  recs.forEach((rec, i) => {
    const textW = CONTENT_W - 28
    const lines = wrapToLines(doc, rec.text, textW, 9, 3)
    const blockH = lineBlockHeight(lines.length, 9) + 10
    y = fitBlock(doc, y, blockH, pageNum)
    fixedText(doc, `${i + 1}.`, MARGIN, y + 2, { fontSize: 10, bold: true, color: NAVY })
    const lineH = 12
    lines.forEach((ln, li) => {
      fixedText(doc, ln, MARGIN + 20, y + li * lineH, { fontSize: 9, color: INK, width: textW })
    })
    y += blockH + 6
  })

  resetCursor(doc, MARGIN, FOOTER_Y - 24)
  drawPageFooter(doc, pageNum.current)
}

export function createOperationsReportPdfStream(data, meta = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: true,
  })
  renderOperationsReportPdf(doc, data, meta)
  doc.end()
  return doc
}
