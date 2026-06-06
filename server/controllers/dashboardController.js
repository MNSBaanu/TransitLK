import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import Maintenance from '../models/Maintenance.js'
import Schedule from '../models/Schedule.js'
import Route from '../models/Route.js'

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
      ['scheduled', 'on-time'].includes(schedule.status)
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
    const operationalStatuses = ['scheduled', 'on-time', 'delayed', 'completed', 'cancelled']

    const [
      allBuses,
      allDrivers,
      maintenanceRecords,
      totalRoutes,
      totalOperational,
      completedCount,
      schedules,
    ] = await Promise.all([
      Bus.find({}).lean(),
      Driver.find({}).lean(),
      Maintenance.find({}).populate('bus_id', 'regNumber status').sort({ service_date: -1 }).lean(),
      Route.countDocuments({ status: 'active' }),
      Schedule.countDocuments({ status: { $in: operationalStatuses } }),
      Schedule.countDocuments({ status: 'completed' }),
      Schedule.find({ status: { $in: ['scheduled', 'on-time', 'delayed', 'completed'] } })
        .populate('routeId', 'routeName startPoint endPoint')
        .populate('busId', 'regNumber status')
        .populate('driverId', 'name')
        .sort({ tripDate: -1, departureTime: -1 })
        .limit(8)
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
      onDuty: allDrivers.filter((d) => d.status === 'available').length,
      onLeave: allDrivers.filter((d) => d.status === 'on-leave').length,
      offDuty: allDrivers.filter((d) => d.status === 'off-duty').length,
    }

    const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
    const alerts = buildMaintenanceAlerts(allBuses, maintenanceRecords, schedules)

    const maintenance = {
      total: maintenanceRecords.length,
      totalCost: totalMaintenanceCost,
      alerts,
      urgentCount: alerts.filter((a) => a.severity === 'urgent').length,
    }

    const tripCompletion = totalOperational > 0
      ? Math.round((completedCount / totalOperational) * 100)
      : 0

    const recentSchedules = schedules.map((s) => ({
      _id: s._id,
      routeName: s.routeId?.routeName || '—',
      driverName: s.driverId?.name || '—',
      busReg: s.busId?.regNumber || '—',
      busStatus: s.busId?.status || null,
      departureTime: s.departureTime,
      arrivalTime: s.arrivalTime,
      tripDate: s.tripDate,
      status: s.status,
    }))

    res.json({ buses, drivers, maintenance, recentSchedules, totalRoutes, tripCompletion })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
