import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import Maintenance from '../models/Maintenance.js'
import Schedule from '../models/Schedule.js'
import Route from '../models/Route.js'
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from '../utils/scheduleHelpers.js'
import { isSuperadministrator, requireUserDepot } from '../utils/depotAccess.js'

function formatRouteLabel(route = {}) {
  const start = String(route.startPoint || '').trim()
  const end = String(route.endPoint || '').trim()
  if (start && end) return `${start} → ${end}`
  return route.routeName || '—'
}

const MILEAGE_SERVICE_THRESHOLD = 150_000
const MILEAGE_NO_HISTORY_THRESHOLD = 100_000
const SERVICE_INTERVAL_MS = 180 * 24 * 60 * 60 * 1000

const isOperational = (status) => status === 'available' || status === 'in-service'

function buildMaintenanceAlerts(allBuses, maintenanceRecords, schedules) {
  const latestByBus = new Map()
  for (const record of maintenanceRecords) {
    const busId = String(record.bus_id?._id || record.bus_id || '')
    if (!busId || latestByBus.has(busId)) continue
    latestByBus.set(busId, record)
  }

  const busById = new Map(allBuses.map((bus) => [String(bus._id), bus]))
  const now = Date.now()
  const alerts = []

  for (const bus of allBuses) {
    const busId = String(bus._id)
    const lastService = latestByBus.get(busId)
    const mileage = bus.mileage || 0
    const msSinceService = lastService
      ? now - new Date(lastService.service_date).getTime()
      : Number.POSITIVE_INFINITY

    if (bus.status === 'maintenance') {
      alerts.push({
        _id: `in-maint-${busId}`,
        type: 'in_maintenance',
        severity: 'info',
        title: 'IN MAINTENANCE',
        busReg: bus.regNumber,
        busStatus: bus.status,
        description: lastService?.description || 'Vehicle is currently undergoing maintenance.',
        service_date: lastService?.service_date || null,
        cost: lastService?.cost || null,
      })
      continue
    }

    if (!isOperational(bus.status)) continue

    let reason = null
    if (mileage >= MILEAGE_SERVICE_THRESHOLD) {
      reason = `High mileage (${mileage.toLocaleString()} km) — service required`
    } else if (msSinceService >= SERVICE_INTERVAL_MS) {
      reason = 'Last service was over 6 months ago'
    } else if (!lastService && mileage >= MILEAGE_NO_HISTORY_THRESHOLD) {
      reason = 'No maintenance record on file for high-mileage vehicle'
    }

    if (reason) {
      alerts.push({
        _id: `needs-maint-${busId}`,
        type: 'needs_maintenance',
        severity: 'urgent',
        title: 'MAINTENANCE NEEDED',
        busReg: bus.regNumber,
        busStatus: bus.status,
        description: reason,
        service_date: lastService?.service_date || null,
      })
    }
  }

  for (const schedule of schedules) {
    if (schedule.status === 'delayed') {
      alerts.push({
        _id: `delay-${schedule._id}`,
        type: 'delayed_trip',
        severity: 'warning',
        title: 'TRIP DELAYED',
        busReg: schedule.busId?.regNumber || '—',
        busStatus: schedule.busId?.status || null,
        description: `${schedule.routeId?.routeName || 'Route'} · departure ${schedule.departureTime || '—'}`,
        service_date: schedule.tripDate || null,
      })
    }

    const busId = String(schedule.busId?._id || schedule.busId || '')
    const bus = busById.get(busId)
    if (
      bus?.status === 'maintenance' &&
      ['scheduled', 'on-duty', 'on-time'].includes(schedule.status)
    ) {
      alerts.push({
        _id: `conflict-${schedule._id}`,
        type: 'schedule_conflict',
        severity: 'urgent',
        title: 'SCHEDULE CONFLICT',
        busReg: bus.regNumber,
        busStatus: bus.status,
        description: `${schedule.routeId?.routeName || 'Route'} is assigned to a bus that is in maintenance.`,
        service_date: schedule.tripDate || null,
      })
    }
  }

  const severityRank = { urgent: 0, warning: 1, info: 2 }
  return alerts
    .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9))
    .slice(0, 8)
}

// @desc    Get depot dashboard summary
// @route   GET /api/dashboard
// @access  Protected
export const getDashboardSummary = async (req, res) => {
  try {
    const operationalStatuses = ['scheduled', 'on-duty', 'on-time', 'delayed', 'completed', 'cancelled']

    const monthStart = startOfMonth(new Date())
    const monthEnd = endOfMonth(new Date())
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    const isSuper = isSuperadministrator(req.user)
    const userDepotId = !isSuper ? requireUserDepot(req.user) : null

    const busFilter = userDepotId ? { depotId: userDepotId } : {}
    const driverFilter = userDepotId ? { depotId: userDepotId } : {}
    const routeFilter = userDepotId ? { depotId: userDepotId, status: 'active' } : { status: 'active' }

    let scheduleFilter = {}
    if (userDepotId) {
      const routes = await Route.find({ depotId: userDepotId }).select('_id')
      const routeIds = routes.map((r) => r._id)
      scheduleFilter = { routeId: { $in: routeIds } }
    }

    const [allBuses, allDrivers] = await Promise.all([
      Bus.find(busFilter).lean(),
      Driver.find(driverFilter).lean(),
    ])

    const busIds = allBuses.map((b) => b._id)
    const maintFilter = userDepotId ? { bus_id: { $in: busIds } } : {}

    const [
      maintenanceRecords,
      totalRoutes,
      totalOperational,
      completedCount,
      todaySchedules,
      monthSchedules,
    ] = await Promise.all([
      Maintenance.find(maintFilter).populate('bus_id', 'regNumber status').sort({ service_date: -1 }).lean(),
      Route.countDocuments(routeFilter),
      Schedule.countDocuments({ ...scheduleFilter, status: { $in: operationalStatuses } }),
      Schedule.countDocuments({ ...scheduleFilter, status: 'completed' }),
      Schedule.find({
        ...scheduleFilter,
        tripDate: { $gte: todayStart, $lte: todayEnd },
      })
        .populate('routeId', 'routeName startPoint endPoint status')
        .populate('busId', 'regNumber status')
        .populate('driverId', 'name')
        .sort({ departureTime: 1, status: 1 })
        .lean(),
      Schedule.find({
        ...scheduleFilter,
        tripDate: { $gte: monthStart, $lte: monthEnd },
        status: { $ne: 'cancelled' },
      })
        .select('busId')
        .lean(),
    ])

    const buses = {
      total: allBuses.length,
      available: allBuses.filter((b) => b.status === 'available').length,
      inService: allBuses.filter((b) => b.status === 'in-service').length,
      maintenance: allBuses.filter((b) => b.status === 'maintenance').length,
      byServiceType: {
        express: allBuses.filter((b) => b.serviceType === 'express' && isOperational(b.status)).length,
        ordinary: allBuses.filter((b) => b.serviceType === 'ordinary' && isOperational(b.status)).length,
        semiLuxury: allBuses.filter((b) => b.serviceType === 'semi-luxury' && isOperational(b.status)).length,
      },
      byServiceTypeTotal: {
        express: allBuses.filter((b) => b.serviceType === 'express').length,
        ordinary: allBuses.filter((b) => b.serviceType === 'ordinary').length,
        semiLuxury: allBuses.filter((b) => b.serviceType === 'semi-luxury').length,
      },
    }

    const drivers = {
      total: allDrivers.length,
      available: allDrivers.filter((d) => d.status === 'available').length,
      onDuty: allDrivers.filter((d) => d.status === 'on-duty').length,
      onLeave: allDrivers.filter((d) => d.status === 'on-leave').length,
      offDuty: allDrivers.filter((d) => d.status === 'off-duty').length,
    }

    const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
    const alerts = buildMaintenanceAlerts(allBuses, maintenanceRecords, todaySchedules)

    const maintenance = {
      total: maintenanceRecords.length,
      totalCost: totalMaintenanceCost,
      alerts,
      urgentCount: alerts.filter((a) => a.severity === 'urgent').length,
    }

    const tripCompletion = totalOperational > 0
      ? Math.round((completedCount / totalOperational) * 100)
      : 0

    const busesUsed = new Set(
      monthSchedules.map((s) => String(s.busId)).filter(Boolean)
    )
    const busesTotal = allBuses.length
    const vehicleUtilization = {
      rate: busesTotal > 0 ? Math.round((busesUsed.size / busesTotal) * 1000) / 10 : 0,
      busesUsed: busesUsed.size,
      busesTotal,
    }

    const operations = todaySchedules.map((s) => ({
      _id: s._id,
      routeLabel: formatRouteLabel(s.routeId),
      routeName: s.routeId?.routeName || '—',
      driverName: s.driverId?.name || '—',
      busReg: s.busId?.regNumber || '—',
      departureTime: s.departureTime || '—',
      arrivalTime: s.arrivalTime || '—',
      status: s.status,
    }))

    res.json({
      buses,
      drivers,
      maintenance,
      operations,
      ongoingOperations: operations,
      totalRoutes,
      tripCompletion,
      vehicleUtilization,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
