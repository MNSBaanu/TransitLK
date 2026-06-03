import Schedule from '../models/Schedule.js'
import Route from '../models/Route.js'
import Depot from '../models/Depot.js'
import { buildDashboardAnalytics, parseReportRange } from '../services/reportAnalytics.js'
import { createOperationsReportPdfStream } from '../services/reportPdf.js'
import { getUserDepotId, isSuperadministrator, requireUserDepot } from '../utils/depotAccess.js'

async function resolveDepotLabel(user) {
  if (isSuperadministrator(user)) return 'All depots (network-wide)'
  if (user?.depotId?.depotName) return user.depotId.depotName
  const depotId = getUserDepotId(user)
  if (!depotId) return 'Unassigned'
  const depot = await Depot.findById(depotId).select('depotName')
  return depot?.depotName || 'Depot'
}

export const getReportsDashboard = async (req, res) => {
  try {
    const data = await buildDashboardAnalytics(req.query, req.user)
    res.json(data)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

export const exportReportsPdf = async (req, res) => {
  try {
    const data = await buildDashboardAnalytics(req.query, req.user)
    const depotLabel = await resolveDepotLabel(req.user)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transitlk-${data.period.mode}-report-${data.period.from}-${data.period.to}.pdf"`
    )

    const doc = createOperationsReportPdfStream(data, { depotLabel })
    doc.pipe(res)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

export const exportReportsCsv = async (req, res) => {
  try {
    const { start, end } = parseReportRange(req.query)
    const scheduleFilter = { tripDate: { $gte: start, $lte: end } }

    if (!isSuperadministrator(req.user)) {
      const depotId = requireUserDepot(req.user)
      const routeIds = await Route.find({ depotId }).distinct('_id')
      scheduleFilter.routeId = { $in: routeIds }
    }

    const schedules = await Schedule.find(scheduleFilter)
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
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}
