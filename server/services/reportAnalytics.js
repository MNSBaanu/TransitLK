import Schedule from '../models/Schedule.js'
import Route from '../models/Route.js'
import Driver from '../models/Driver.js'
import Bus from '../models/Bus.js'
import FuelLog from '../models/FuelLog.js'
import Maintenance from '../models/Maintenance.js'
import { isSuperadministrator, requireUserDepot } from '../utils/depotAccess.js'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  timeToMinutes,
} from '../utils/scheduleHelpers.js'

export function parseReportRange({ from, to, period = 'monthly' }) {
  const anchor = to ? new Date(to) : new Date()
  if (from && to) {
    return { start: startOfDay(from), end: endOfDay(to), mode: period }
  }
  if (period === 'weekly') {
    return { start: startOfWeek(anchor), end: endOfWeek(anchor), mode: 'weekly' }
  }
  return { start: startOfMonth(anchor), end: endOfMonth(anchor), mode: 'monthly' }
}

function tripDurationHours(departureTime, arrivalTime) {
  const dep = timeToMinutes(departureTime)
  const arr = timeToMinutes(arrivalTime)
  if (dep == null || arr == null || arr <= dep) return 0
  return (arr - dep) / 60
}

function isCompletedStatus(status) {
  return status === 'completed' || status === 'on-time'
}

function isScheduledStatus(status) {
  return ['scheduled', 'approved', 'on-time', 'completed', 'delayed', 'pending'].includes(
    status
  )
}

function bucketLabel(date, index, period, bucketCount) {
  if (period === 'weekly') {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
  }
  return `W${index + 1}`
}

export async function buildDashboardAnalytics(query = {}, user = null) {
  const { from, to, period = 'monthly', routeId, busId } = query
  const { start, end, mode } = parseReportRange({ from, to, period })
  const scoped = user && !isSuperadministrator(user)
  const depotId = scoped ? requireUserDepot(user) : null

  const [scopedRouteIds, scopedBusIds] = await Promise.all([
    scoped ? Route.find({ depotId }).distinct('_id') : Promise.resolve(null),
    scoped ? Bus.find({ depotId }).distinct('_id') : Promise.resolve(null),
  ])

  const scheduleFilter = { tripDate: { $gte: start, $lte: end } }
  if (scoped) scheduleFilter.routeId = { $in: scopedRouteIds || [] }
  if (routeId) scheduleFilter.routeId = routeId
  if (scoped && routeId && !scopedRouteIds.some((id) => String(id) === String(routeId))) {
    scheduleFilter.routeId = null
  }
  if (busId) scheduleFilter.busId = busId
  if (scoped && busId && !scopedBusIds.some((id) => String(id) === String(busId))) {
    scheduleFilter.busId = null
  }

  const [schedules, routes, drivers, buses, fuelLogs, maintenanceRecords] = await Promise.all([
    Schedule.find(scheduleFilter)
      .populate('routeId', 'routeName distance status serviceType')
      .populate('busId', 'regNumber capacity status')
      .populate('driverId', 'name status licenseNo'),
    Route.find(scoped ? { depotId } : {}).select('routeName distance status startPoint endPoint'),
    Driver.find(scoped ? { depotId } : {}).select('name status workingHours'),
    Bus.find(scoped ? { depotId } : {}).select('regNumber capacity status serviceType mileage'),
    FuelLog.find({
      ...(scoped ? { bus_id: { $in: scopedBusIds || [] } } : {}),
      fuel_date: { $gte: start, $lte: end },
    })
      .populate('bus_id', 'regNumber')
      .sort({ fuel_date: -1 }),
    Maintenance.find({
      ...(scoped ? { bus_id: { $in: scopedBusIds || [] } } : {}),
      service_date: { $gte: start, $lte: end },
    })
      .populate('bus_id', 'regNumber')
      .sort({ service_date: -1 }),
  ])

  const nonCancelled = schedules.filter((s) => s.status !== 'cancelled')
  const completed = schedules.filter((s) => isCompletedStatus(s.status))
  const delayed = schedules.filter((s) => s.status === 'delayed')
  const cancelled = schedules.filter((s) => s.status === 'cancelled')
  const activeTrips = nonCancelled.length

  const hasData = schedules.length > 0

  const tripCompletionRate =
    activeTrips > 0 ? Math.round((completed.length / activeTrips) * 1000) / 10 : 0

  const busesUsed = new Set(
    nonCancelled.map((s) => String(s.busId?._id || s.busId)).filter(Boolean)
  )
  const vehicleUtilizationRate =
    buses.length > 0 ? Math.round((busesUsed.size / buses.length) * 1000) / 10 : 0

  const driverIdsActive = new Set(
    nonCancelled.map((s) => String(s.driverId?._id || s.driverId)).filter(Boolean)
  )
  const driversOnDuty = driverIdsActive.size
  const driversTotal = drivers.length
  const onDutyPct =
    driversTotal > 0 ? Math.round((driversOnDuty / driversTotal) * 1000) / 10 : 0

  const totalLiters = fuelLogs.reduce((sum, f) => sum + (f.liters || 0), 0)
  const totalFuelCost = fuelLogs.reduce((sum, f) => sum + (f.amount || 0), 0)
  const maintenanceCost = maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0)

  const bucketCount = mode === 'weekly' ? 7 : 4
  const rangeMs = Math.max(end.getTime() - start.getTime(), 1)
  const bucketMs = rangeMs / bucketCount

  const weeklyCompletion = []
  const fuelTrend = []
  for (let i = 0; i < bucketCount; i++) {
    const bStart = new Date(start.getTime() + i * bucketMs)
    const bEnd = new Date(start.getTime() + (i + 1) * bucketMs)
    const inBucket = schedules.filter((s) => {
      const d = new Date(s.tripDate)
      return d >= bStart && d < bEnd
    })
    const active = inBucket.filter((s) => s.status !== 'cancelled')
    const done = inBucket.filter((s) => isCompletedStatus(s.status))
    const scheduled = inBucket.filter((s) => isScheduledStatus(s.status))
    const actualPct = active.length ? Math.round((done.length / active.length) * 100) : 0
    const scheduledPct = inBucket.length
      ? Math.round((scheduled.length / inBucket.length) * 100)
      : 0
    weeklyCompletion.push({
      label: bucketLabel(bStart, i, mode, bucketCount),
      actual: actualPct,
      planned: scheduledPct,
      trips: inBucket.length,
      completed: done.length,
      scheduled: scheduled.length,
      delayed: inBucket.filter((s) => s.status === 'delayed').length,
      cancelled: inBucket.filter((s) => s.status === 'cancelled').length,
    })

    const fuelInBucket = fuelLogs.filter((f) => {
      const d = new Date(f.fuel_date)
      return d >= bStart && d < bEnd
    })
    fuelTrend.push({
      label: bucketLabel(bStart, i, mode, bucketCount),
      liters: Math.round(fuelInBucket.reduce((s, f) => s + (f.liters || 0), 0) * 10) / 10,
      cost: Math.round(fuelInBucket.reduce((s, f) => s + (f.amount || 0), 0)),
    })
  }

  const routeStats = new Map()
  for (const route of routes) {
    routeStats.set(String(route._id), {
      routeId: route._id,
      routeName: route.routeName,
      distance: route.distance || 0,
      status: route.status || 'active',
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      tripCount: 0,
      completed: 0,
      delayed: 0,
      cancelled: 0,
      operationalHours: 0,
    })
  }
  for (const s of schedules) {
    const rid = String(s.routeId?._id || s.routeId)
    if (!routeStats.has(rid)) {
      routeStats.set(rid, {
        routeId: rid,
        routeName: s.routeId?.routeName || 'Unknown',
        distance: s.routeId?.distance || 0,
        status: s.routeId?.status || 'active',
        tripCount: 0,
        completed: 0,
        delayed: 0,
        cancelled: 0,
        operationalHours: 0,
      })
    }
    const row = routeStats.get(rid)
    row.tripCount += 1
    if (s.status === 'cancelled') row.cancelled += 1
    else {
      row.operationalHours += tripDurationHours(s.departureTime, s.arrivalTime)
      if (isCompletedStatus(s.status)) row.completed += 1
      if (s.status === 'delayed') row.delayed += 1
    }
  }

  const routesAnalytics = [...routeStats.values()]
    .map((r) => ({
      ...r,
      completionRate:
        r.tripCount > r.cancelled
          ? Math.round((r.completed / (r.tripCount - r.cancelled)) * 1000) / 10
          : 0,
      operationalHours: Math.round(r.operationalHours * 10) / 10,
    }))
    .sort((a, b) => b.tripCount - a.tripCount)

  const busToRoutes = new Map()
  for (const s of nonCancelled) {
    const bid = String(s.busId?._id || s.busId)
    const rid = String(s.routeId?._id || s.routeId)
    if (!bid || !rid) continue
    if (!busToRoutes.has(bid)) busToRoutes.set(bid, new Set())
    busToRoutes.get(bid).add(rid)
  }

  const routeFuelMap = new Map()
  for (const r of routesAnalytics) {
    routeFuelMap.set(String(r.routeId), { routeName: r.routeName, liters: 0, distance: r.distance })
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
    .filter((r) => r.liters > 0)
    .map((r) => ({
      routeName: r.routeName,
      liters: Math.round(r.liters * 10) / 10,
      litersPerKm:
        r.distance > 0 ? (Math.round((r.liters / r.distance) * 10) / 10).toFixed(1) : '—',
    }))
    .sort((a, b) => b.liters - a.liters)
    .slice(0, 8)

  const driverStats = new Map()
  for (const d of drivers) {
    driverStats.set(String(d._id), {
      driverId: d._id,
      name: d.name,
      status: d.status || 'available',
      trips: 0,
      completed: 0,
      delayed: 0,
      cancelled: 0,
      hours: 0,
    })
  }
  for (const s of schedules) {
    const did = String(s.driverId?._id || s.driverId)
    if (!did) continue
    if (!driverStats.has(did)) {
      driverStats.set(did, {
        driverId: did,
        name: s.driverId?.name || 'Unknown',
        status: s.driverId?.status,
        trips: 0,
        completed: 0,
        delayed: 0,
        cancelled: 0,
        hours: 0,
      })
    }
    const row = driverStats.get(did)
    row.trips += 1
    if (s.status === 'cancelled') row.cancelled += 1
    else {
      row.hours += tripDurationHours(s.departureTime, s.arrivalTime)
      if (isCompletedStatus(s.status)) row.completed += 1
      if (s.status === 'delayed') row.delayed += 1
    }
  }

  const driverPerformance = [...driverStats.values()]
    .filter((d) => d.trips > 0)
    .map((d) => ({
      ...d,
      hours: Math.round(d.hours * 10) / 10,
      completionRate:
        d.trips > d.cancelled
          ? Math.round((d.completed / (d.trips - d.cancelled)) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.trips - a.trips)

  const vehicleStats = buses.map((b) => {
    const bid = String(b._id)
    const trips = nonCancelled.filter((s) => String(s.busId?._id || s.busId) === bid)
    const hours = trips.reduce(
      (sum, s) => sum + tripDurationHours(s.departureTime, s.arrivalTime),
      0
    )
    return {
      busId: b._id,
      regNumber: b.regNumber,
      status: b.status,
      capacity: b.capacity,
      tripCount: trips.length,
      utilizationHours: Math.round(hours * 10) / 10,
      utilized: trips.length > 0,
    }
  })

  const fuelByRouteMap = new Map(fuelByRoute.map((f) => [f.routeName, f]))

  const monthlySummary = routesAnalytics
    .filter((r) => r.tripCount > 0)
    .map((row) => {
      const activeCount = row.tripCount - row.cancelled
      const rate = activeCount ? row.completed / activeCount : 0
      let status = 'OPTIMAL'
      if (rate < 0.85 || row.delayed >= 2) status = 'STABLE'
      if (rate < 0.7 || row.delayed >= 4 || row.cancelled >= 3) status = 'AT RISK'
      const routeFuel = fuelByRouteMap.get(row.routeName)
      return {
        depotUnit: row.routeName,
        operationalHours: `${Math.round(row.operationalHours).toLocaleString()} hrs`,
        incidents: row.delayed + row.cancelled,
        incidentsLabel:
          row.delayed + row.cancelled === 0
            ? '0'
            : `${row.delayed} delayed · ${row.cancelled} cancelled`,
        completionRate: row.completionRate,
        tripCount: row.tripCount,
        fuelLiters: routeFuel?.liters ?? 0,
        status,
      }
    })

  const periodLabel = mode === 'weekly' ? 'Weekly' : 'Monthly'
  const topRoutes = routesAnalytics.filter((r) => r.tripCount > 0).slice(0, 5)
  const peakFuel = fuelTrend.reduce(
    (best, t) => (t.liters > (best?.liters || 0) ? t : best),
    fuelTrend[0] || null
  )
  const lowestCompletion = weeklyCompletion.reduce(
    (min, w) => (w.actual < (min?.actual ?? 101) ? w : min),
    weeklyCompletion[0] || null
  )

  const routesWithTrips = routesAnalytics.filter((r) => r.tripCount > r.cancelled)
  const routeCompletionRate =
    routesWithTrips.length > 0
      ? Math.round(
          (routesWithTrips.reduce((s, r) => s + r.completionRate, 0) / routesWithTrips.length) * 10
        ) / 10
      : tripCompletionRate

  const routeFuelLiters = Math.round(fuelByRoute.reduce((s, r) => s + r.liters, 0) * 10) / 10

  const rankByCompletion = [...routesWithTrips].sort((a, b) => {
    if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate
    return b.completed - a.completed
  })
  const bestPerformingRoute = rankByCompletion[0]
    ? {
        routeName: rankByCompletion[0].routeName,
        routeId: rankByCompletion[0].routeId,
        completionRate: rankByCompletion[0].completionRate,
        tripCount: rankByCompletion[0].tripCount,
        delayed: rankByCompletion[0].delayed,
        operationalHours: rankByCompletion[0].operationalHours,
      }
    : null
  const worstPerformingRoute = rankByCompletion.length
    ? {
        routeName: rankByCompletion[rankByCompletion.length - 1].routeName,
        routeId: rankByCompletion[rankByCompletion.length - 1].routeId,
        completionRate: rankByCompletion[rankByCompletion.length - 1].completionRate,
        tripCount: rankByCompletion[rankByCompletion.length - 1].tripCount,
        delayed: rankByCompletion[rankByCompletion.length - 1].delayed,
        cancelled: rankByCompletion[rankByCompletion.length - 1].cancelled,
      }
    : null

  const highestFuelRoute = fuelByRoute[0]
    ? {
        routeName: fuelByRoute[0].routeName,
        liters: fuelByRoute[0].liters,
        litersPerKm: fuelByRoute[0].litersPerKm,
      }
    : null

  const routeDelayAnalysis = [...routesWithTrips]
    .filter((r) => r.delayed > 0)
    .sort((a, b) => b.delayed - a.delayed || b.cancelled - a.cancelled)
    .map((r) => ({
      routeName: r.routeName,
      delayed: r.delayed,
      cancelled: r.cancelled,
      tripCount: r.tripCount,
      completionRate: r.completionRate,
      shareOfDelays:
        delayed.length > 0 ? Math.round((r.delayed / delayed.length) * 1000) / 10 : 0,
    }))

  const recommendations = []
  if (!hasData) {
    recommendations.push({
      priority: 'info',
      icon: 'info',
      text: 'No trips in this period. Create schedules in Schedule Management to unlock analytics.',
    })
  } else {
    if (worstPerformingRoute && worstPerformingRoute.completionRate < 85) {
      recommendations.push({
        priority: 'high',
        icon: 'warning',
        text: `Prioritize ${worstPerformingRoute.routeName}: ${worstPerformingRoute.completionRate}% completion, ${worstPerformingRoute.delayed} delayed trip(s). Review staffing and timing.`,
      })
    }
    if (delayed.length >= 3) {
      recommendations.push({
        priority: 'high',
        icon: 'schedule',
        text: `${delayed.length} delayed incidents in period — use Schedule Adjust for cover drivers or rescheduled departures.`,
      })
    }
    if (vehicleUtilizationRate < 65 && buses.length > 0) {
      recommendations.push({
        priority: 'medium',
        icon: 'directions_bus',
        text: `Fleet utilization is ${vehicleUtilizationRate}% (${busesUsed.size}/${buses.length} buses). Consider consolidating trips or redeploying idle vehicles.`,
      })
    }
    if (highestFuelRoute && totalLiters > 0) {
      const fuelShare = Math.round((highestFuelRoute.liters / totalLiters) * 100)
      if (fuelShare >= 35) {
        recommendations.push({
          priority: 'medium',
          icon: 'local_gas_station',
          text: `${highestFuelRoute.routeName} accounts for ~${fuelShare}% of fuel (${highestFuelRoute.liters} L). Review distance, load, and maintenance for buses on this route.`,
        })
      }
    }
    if (monthlySummary.filter((r) => r.status === 'AT RISK').length > 0) {
      recommendations.push({
        priority: 'high',
        icon: 'report',
        text: `${monthlySummary.filter((r) => r.status === 'AT RISK').length} route(s) marked at risk — align with depot managers on incident reduction targets.`,
      })
    }
    if (routeDelayAnalysis.length > 0 && routeDelayAnalysis[0].delayed >= 2) {
      recommendations.push({
        priority: 'medium',
        icon: 'timeline',
        text: `Most delays on ${routeDelayAnalysis[0].routeName} (${routeDelayAnalysis[0].delayed} incidents, ${routeDelayAnalysis[0].shareOfDelays}% of depot delays).`,
      })
    }
    if (bestPerformingRoute && bestPerformingRoute.completionRate >= 90) {
      recommendations.push({
        priority: 'low',
        icon: 'thumb_up',
        text: `${bestPerformingRoute.routeName} is best performing at ${bestPerformingRoute.completionRate}% — use as a benchmark for other routes.`,
      })
    }
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        icon: 'check_circle',
        text: 'Operations are within normal thresholds for this period. Continue monitoring weekly completion and fuel trends.',
      })
    }
  }

  const operationalInsights = {
    bestPerformingRoute,
    worstPerformingRoute,
    highestFuelConsumingRoute: highestFuelRoute,
    fleetUtilization: {
      rate: vehicleUtilizationRate,
      busesUsed: busesUsed.size,
      busesTotal: buses.length,
      driversOnDuty,
      driversTotal,
      onDutyPct,
    },
    routeDelayAnalysis,
    recommendations,
  }

  const autoReport = {
    generatedAt: new Date().toISOString(),
    title: `${periodLabel} Operations Report`,
    subtitle: `Automatically generated from schedules, routes, fuel logs, and fleet data`,
    periodLabel,
    highlights: hasData
      ? [
          `Trip completion rate: ${tripCompletionRate}% across ${activeTrips} active trips (${completed.length} completed)`,
          `Vehicle utilization: ${vehicleUtilizationRate}% — ${busesUsed.size} of ${buses.length} buses used`,
          `Fuel logs: ${fuelLogs.length} entries, ${Math.round(totalLiters * 10) / 10} L (LKR ${totalFuelCost.toLocaleString()})`,
          topRoutes.length
            ? `Top route: ${topRoutes[0].routeName} — ${topRoutes[0].tripCount} trips, ${topRoutes[0].completionRate}% completion`
            : 'Routes exist but no trips in this period',
        ]
      : ['No schedule, fuel, or trip records in the selected date range.'],
    sections: [
      {
        id: 'trip-completion',
        title: 'Trip completion rates',
        icon: 'check_circle',
        metrics: [
          { label: 'Total trips', value: String(schedules.length) },
          { label: 'Completion rate', value: `${tripCompletionRate}%` },
          { label: 'Completed trips', value: String(completed.length) },
          { label: 'Delayed', value: String(delayed.length) },
          { label: 'Cancelled', value: String(cancelled.length) },
        ],
        chart: weeklyCompletion,
        narrative: !hasData
          ? 'No trips in this period. Data is read from Schedule Management in real time.'
          : tripCompletionRate >= 90
            ? `${completed.length} of ${activeTrips} active trips completed (${tripCompletionRate}%) per live schedule records.`
            : tripCompletionRate >= 75
              ? `${delayed.length} delayed and ${cancelled.length} cancelled trips in period${lowestCompletion ? `; lowest completion ${lowestCompletion.label}: ${lowestCompletion.actual}%` : ''}.`
              : `Only ${tripCompletionRate}% completion — review ${delayed.length} delayed and ${cancelled.length} cancelled trips in MongoDB schedules.`,
      },
      {
        id: 'route-performance',
        title: 'Route performance',
        icon: 'map',
        metrics: [
          { label: 'Total routes tracked', value: String(routes.length) },
          { label: 'Route completion rate', value: `${routeCompletionRate}%` },
          { label: 'Delayed incidents', value: String(delayed.length) },
          {
            label: 'Fuel consumption by route',
            value: routeFuelLiters > 0 ? `${routeFuelLiters} L` : '—',
          },
        ],
        routes: topRoutes.map((r) => ({
          routeName: r.routeName,
          distance: r.distance,
          status: r.status,
          tripCount: r.tripCount,
          completionRate: r.completionRate,
          operationalHours: r.operationalHours,
          delayed: r.delayed,
          cancelled: r.cancelled,
        })),
        table: monthlySummary.slice(0, 8),
        narrative: !hasData
          ? 'No route trips found. Route list comes from Route Management; trips from Schedule Management.'
          : monthlySummary.some((r) => r.status === 'AT RISK')
            ? `${monthlySummary.filter((r) => r.status === 'AT RISK').length} route(s) marked at risk from actual delayed/cancelled counts.`
            : `All ${routesAnalytics.filter((r) => r.tripCount > 0).length} active routes performing within thresholds from live data.`,
      },
      {
        id: 'operational-insights',
        title: 'Operational Insights',
        icon: 'psychology',
        metrics: [
          {
            label: 'Best performing route',
            value: bestPerformingRoute
              ? `${bestPerformingRoute.routeName} · ${bestPerformingRoute.completionRate}%`
              : '—',
          },
          {
            label: 'Worst performing route',
            value: worstPerformingRoute
              ? `${worstPerformingRoute.routeName} · ${worstPerformingRoute.completionRate}%`
              : '—',
          },
          {
            label: 'Highest fuel consuming route',
            value: highestFuelRoute
              ? `${highestFuelRoute.routeName} · ${highestFuelRoute.liters} L`
              : '—',
          },
          {
            label: 'Fleet utilization',
            value:
              buses.length > 0
                ? `${vehicleUtilizationRate}% (${busesUsed.size}/${buses.length} buses)`
                : '—',
          },
        ],
        routeDelayAnalysis: routeDelayAnalysis.slice(0, 8),
        recommendations,
        narrative:
          'Data-driven insights from live schedules, routes, and fuel logs to support operational decision-making.',
      },
      {
        id: 'fuel-trends',
        title: 'Fuel consumption trends',
        icon: 'local_gas_station',
        metrics: [
          { label: 'Total liters', value: `${Math.round(totalLiters * 10) / 10} L` },
          { label: 'Total cost', value: `LKR ${totalFuelCost.toLocaleString()}` },
          { label: 'Fuel entries', value: String(fuelLogs.length) },
        ],
        trend: fuelTrend,
        byRoute: fuelByRoute,
        narrative: !fuelLogs.length
          ? 'No fuel logs in Fuel & Maintenance for this period.'
          : peakFuel
            ? `${fuelLogs.length} fuel log(s) totalling ${Math.round(totalLiters * 10) / 10} L; peak bucket ${peakFuel.label} (${peakFuel.liters} L).`
            : `${fuelLogs.length} fuel log(s) recorded totalling ${Math.round(totalLiters * 10) / 10} L.`,
      },
    ],
  }

  const litersPerCompletedTrip =
    completed.length > 0 ? Math.round((totalLiters / completed.length) * 10) / 10 : 0

  return {
    dataSource: 'live',
    hasData,
    recordCounts: {
      schedules: schedules.length,
      routes: routes.length,
      buses: buses.length,
      drivers: drivers.length,
      fuelLogs: fuelLogs.length,
      maintenanceRecords: maintenanceRecords.length,
    },
    autoReport,
    period: {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      mode,
    },
    summary: {
      tripCompletionRate,
      routeCompletionRate,
      vehicleUtilizationRate,
      driversOnDuty,
      driversTotal,
      onDutyPct,
      totalTrips: schedules.length,
      activeTrips,
      completedTrips: completed.length,
      delayedTrips: delayed.length,
      delayedIncidents: delayed.length,
      cancelledTrips: cancelled.length,
      totalRoutes: routes.length,
      routesTracked: routes.length,
      routeFuelLiters,
      activeRoutes: routes.filter((r) => r.status === 'active').length,
    },
    operationalInsights,
    scheduleBreakdown: {
      completed: completed.length,
      delayed: delayed.length,
      cancelled: cancelled.length,
      draft: schedules.filter((s) => s.status === 'draft').length,
      pending: schedules.filter((s) => s.status === 'pending').length,
      scheduled: schedules.filter((s) => s.status === 'scheduled' || s.status === 'approved').length,
    },
    tripCompletion: {
      rate: tripCompletionRate,
      miniBars: weeklyCompletion.map((w) => w.actual),
    },
    drivers: {
      active: driversOnDuty,
      total: driversTotal,
      onDutyPct,
    },
    weeklyCompletion,
    fuel: {
      totalLiters: Math.round(totalLiters * 10) / 10,
      totalCost: totalFuelCost,
      byRoute: fuelByRoute,
      trend: fuelTrend,
      recentLogs: fuelLogs.slice(0, 10).map((f) => ({
        date: new Date(f.fuel_date).toISOString().slice(0, 10),
        bus: f.bus_id?.regNumber || '—',
        liters: f.liters,
        amount: f.amount,
      })),
    },
    maintenance: {
      recordCount: maintenanceRecords.length,
      totalCost: maintenanceCost,
      recent: maintenanceRecords.slice(0, 5).map((m) => ({
        date: new Date(m.service_date).toISOString().slice(0, 10),
        bus: m.bus_id?.regNumber || '—',
        description: m.description,
        cost: m.cost,
      })),
    },
    routes: routesAnalytics,
    driverPerformance,
    vehicles: vehicleStats,
    monthlySummary,
    operationalKpis: {
      tripCompletionRate,
      vehicleUtilizationRate,
      litersPerCompletedTrip,
      totalFuelCost,
      maintenanceCost,
      totalOperationalHours: Math.round(
        routesAnalytics.reduce((s, r) => s + r.operationalHours, 0) * 10
      ) / 10,
    },
    totals: {
      trips: schedules.length,
      activeTrips,
      routes: routes.length,
    },
  }
}
