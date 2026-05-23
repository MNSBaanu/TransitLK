import Schedule from '../models/Schedule.js'
import { buildDashboardAnalytics, parseReportRange } from '../services/reportAnalytics.js'

export const getReportsDashboard = async (req, res) => {
  try {
    const data = await buildDashboardAnalytics(req.query)
    res.json(data)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const exportReportsPdf = async (req, res) => {
  try {
    const PDFDocument = (await import('pdfkit')).default
    const data = await buildDashboardAnalytics(req.query)
    const report = data.autoReport

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transitlk-${data.period.mode}-report-${data.period.from}-${data.period.to}.pdf"`
    )

    const doc = new PDFDocument({ margin: 48, size: 'A4' })
    doc.pipe(res)

    doc.fontSize(16).text(report?.title || 'TransitLK Operations Report', { underline: true })
    doc.fontSize(9).fillColor('#555555')
    doc.text(`Period: ${data.period.from} to ${data.period.to}`)
    doc.text(`Generated: ${new Date(report?.generatedAt || Date.now()).toLocaleString('en-GB')}`)
    doc.text(`Data source: ${data.dataSource || 'live database'}`)
    doc.fillColor('#000000')
    doc.moveDown()

    if (!data.hasData) {
      doc.fontSize(11).text('No operational records in this date range.')
      doc.end()
      return
    }

    ;(report?.highlights || []).forEach((h) => doc.fontSize(9).text(`• ${h}`))
    doc.moveDown()

    for (const section of report?.sections || []) {
      doc.fontSize(12).text(section.title, { underline: true })
      doc.fontSize(9).text(section.narrative || '')
      ;(section.metrics || []).forEach((m) => doc.text(`${m.label}: ${m.value}`))
      doc.moveDown(0.5)
    }

    doc.end()
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const exportReportsCsv = async (req, res) => {
  try {
    const { start, end } = parseReportRange(req.query)
    const schedules = await Schedule.find({ tripDate: { $gte: start, $lte: end } })
      .populate('routeId', 'routeName distance status')
      .populate('busId', 'regNumber')
      .populate('driverId', 'name')
      .sort({ tripDate: 1, departureTime: 1 })

    const header =
      'Date,Route,RouteStatus,DistanceKm,Bus,Driver,Departure,Arrival,Status,AdjustmentReason'
    const rows = schedules.map((s) => {
      const cols = [
        new Date(s.tripDate).toISOString().slice(0, 10),
        s.routeId?.routeName || '',
        s.routeId?.status || '',
        s.routeId?.distance ?? '',
        s.busId?.regNumber || '',
        s.driverId?.name || '',
        s.departureTime,
        s.arrivalTime,
        s.status,
        s.adjustmentReason || 'normal',
      ]
      return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transitlk-report-${start.toISOString().slice(0, 10)}-${end.toISOString().slice(0, 10)}.csv"`
    )
    res.send([header, ...rows].join('\n'))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
