import Schedule from '../models/Schedule.js'
import Route from '../models/Route.js'
import Driver from '../models/Driver.js'
import FuelLog from '../models/FuelLog.js'
import { startOfDay, endOfDay, timeToMinutes } from '../utils/scheduleHelpers.js'

function parseRange(from, to) {
  const end = to ? endOfDay(to) : endOfDay(new Date())
  const start = from ? startOfDay(from) : startOfDay(new Date(end.getFullYear(), end.getMonth(), 1))
  return { start, end }
}

function tripDurationHours(departureTime, arrivalTime) {
  const dep = timeToMinutes(departureTime)
  const arr = timeToMinutes(arrivalTime)
  if (dep == null || arr == null || arr <= dep) return 0
  return (arr - dep) / 60
}

function weekLabel(date, index) {
  return `WK ${index + 1}`
}

export const getReportsDashboard = async (req, res) => {
  try {
    const { from, to, period = 'monthly' } = req.query
    const { start, end } = parseRange(from, to)

    const [schedules, routes, drivers, fuelLogs] = await Promise.all([
      Schedule.find({
        tripDate: { $gte: start, $lte: end },
      })
        .populate('routeId', 'routeName distance')
        .populate('busId', 'regNumber')
        .populate('driverId', 'name status'),
      Route.find().select('routeName distance'),
      Driver.find().select('name status'),
      FuelLog.find({
        fuel_date: { $gte: start, $lte: end },
      }).populate('bus_id', 'regNumber'),
    ])

    const active = schedules.filter((s) => s.status !== 'cancelled')
    const completed = active.filter((s) => s.status === 'completed' || s.status === 'on-time')
    const completionRate =
      active.length > 0 ? Math.round((completed.length / active.length) * 1000) / 10 : 100

    const driverIdsOnDuty = new Set(
      active.map((s) => String(s.driverId?._id || s.driverId)).filter(Boolean)
    )
    const driversOnDuty = driverIdsOnDuty.size
    const driversTotal = drivers.length
    const onDutyPct =
      driversTotal > 0 ? Math.round((driversOnDuty / driversTotal) * 1000) / 10 : 0

    const totalLiters = fuelLogs.reduce((sum, f) => sum + (f.liters || 0), 0)
    const totalFuelCost = fuelLogs.reduce((sum, f) => sum + (f.amount || 0), 0)

    const weekBuckets = period === 'weekly' ? 4 : 4
    const rangeMs = end.getTime() - start.getTime()
    const bucketMs = rangeMs / weekBuckets || 1
    const weeklyCompletion = []
    for (let i = 0; i < weekBuckets; i++) {
      const bStart = new Date(start.getTime() + i * bucketMs)
      const bEnd = new Date(start.getTime() + (i + 1) * bucketMs)
      const inBucket = active.filter((s) => {
        const d = new Date(s.tripDate)
        return d >= bStart && d < bEnd
      })
      const done = inBucket.filter((s) => s.status === 'completed' || s.status === 'on-time')
      const actualPct = inBucket.length ? Math.round((done.length / inBucket.length) * 100) : 0
      const plannedPct = 95 + (i % 3)
      weeklyCompletion.push({
        label: weekLabel(bStart, i),
        actual: actualPct,
        planned: plannedPct,
      })
    }

    const miniBars = weeklyCompletion.map((w) => w.actual)

    const routeFuelMap = new Map()
    for (const route of routes) {
      routeFuelMap.set(String(route._id), {
        routeId: route._id,
        routeName: route.routeName,
        liters: 0,
        distance: route.distance || 0,
        trips: 0,
      })
    }
    for (const s of active) {
      const rid = String(s.routeId?._id || s.routeId)
      if (routeFuelMap.has(rid)) {
        routeFuelMap.get(rid).trips += 1
      }
    }
    const busToRoutes = new Map()
    for (const s of active) {
      const bid = String(s.busId?._id || s.busId)
      const rid = String(s.routeId?._id || s.routeId)
      if (!bid || !rid) continue
      if (!busToRoutes.has(bid)) busToRoutes.set(bid, new Set())
      busToRoutes.get(bid).add(rid)
    }
    for (const log of fuelLogs) {
      const bid = String(log.bus_id?._id || log.bus_id)
      const routeIds = busToRoutes.get(bid)
      if (!routeIds?.size) continue
      const share = (log.liters || 0) / routeIds.size
      for (const rid of routeIds) {
        if (routeFuelMap.has(rid)) routeFuelMap.get(rid).liters += share
      }
    }

    const fuelByRoute = [...routeFuelMap.values()]
      .filter((r) => r.trips > 0 || r.liters > 0)
      .map((r) => ({
        routeName: r.routeName,
        liters: Math.round(r.liters * 10) / 10,
        litersPerKm:
          r.distance > 0 ? (Math.round((r.liters / r.distance) * 10) / 10).toFixed(1) : '—',
      }))
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 5)

    const routePerformance = new Map()
    for (const s of schedules) {
      const rid = String(s.routeId?._id || s.routeId)
      const name = s.routeId?.routeName || 'Unknown route'
      if (!routePerformance.has(rid)) {
        routePerformance.set(rid, {
          routeName: name,
          operationalHours: 0,
          incidents: 0,
          completed: 0,
          total: 0,
        })
      }
      const row = routePerformance.get(rid)
      row.total += 1
      if (s.status !== 'cancelled') {
        row.operationalHours += tripDurationHours(s.departureTime, s.arrivalTime)
        if (s.status === 'completed' || s.status === 'on-time') row.completed += 1
      }
      if (s.status === 'delayed' || s.status === 'cancelled') row.incidents += 1
    }

    const monthlySummary = [...routePerformance.values()].map((row) => {
      const rate = row.total ? row.completed / row.total : 1
      let status = 'OPTIMAL'
      if (rate < 0.85 || row.incidents >= 3) status = 'STABLE'
      if (rate < 0.7 || row.incidents >= 5) status = 'AT RISK'
      const revenueImpact =
        row.incidents === 0
          ? `+LKR ${(1200 + Math.round(row.operationalHours * 8)).toLocaleString()}`
          : `-LKR ${(row.incidents * 600).toLocaleString()}`
      return {
        depotUnit: row.routeName,
        operationalHours: `${Math.round(row.operationalHours).toLocaleString()} hrs`,
        incidents: row.incidents,
        incidentsLabel: row.incidents === 0 ? '0' : `${row.incidents} (Minor)`,
        revenueImpact,
        status,
      }
    })

    const co2SavedTons = Math.round((completed.length * 0.08 + totalLiters * 0.002) * 10) / 10
    const electricEfficiency = Math.min(94, Math.round(72 + completionRate * 0.2))

    res.json({
      period: { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), mode: period },
      sustainability: {
        co2SavedTons,
        electricEfficiencyPct: electricEfficiency,
        fleetImpactPct: Math.round(8 + completionRate * 0.06),
      },
      tripCompletion: {
        rate: completionRate,
        miniBars,
      },
      drivers: {
        active: driversOnDuty,
        total: driversTotal,
        onDutyPct,
      },
      weeklyCompletion,
      fuel: {
        totalLiters: Math.round(totalLiters),
        totalCost: totalFuelCost,
        byRoute: fuelByRoute,
      },
      monthlySummary,
      totals: {
        trips: schedules.length,
        activeTrips: active.length,
        routes: routes.length,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const exportReportsCsv = async (req, res) => {
  try {
    const { from, to } = req.query
    const { start, end } = parseRange(from, to)
    const schedules = await Schedule.find({ tripDate: { $gte: start, $lte: end } })
      .populate('routeId', 'routeName')
      .populate('busId', 'regNumber')
      .populate('driverId', 'name')
      .sort({ tripDate: 1, departureTime: 1 })

    const header = 'Date,Route,Bus,Driver,Departure,Arrival,Status,Reason'
    const rows = schedules.map((s) => {
      const date = new Date(s.tripDate).toISOString().slice(0, 10)
      const cols = [
        date,
        s.routeId?.routeName || '',
        s.busId?.regNumber || '',
        s.driverId?.name || '',
        s.departureTime,
        s.arrivalTime,
        s.status,
        s.adjustmentReason || 'normal',
      ]
      return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    })

    const csv = [header, ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="transitlk-report.csv"')
    res.send(csv)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
