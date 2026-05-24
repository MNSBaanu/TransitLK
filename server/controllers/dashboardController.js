import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import Maintenance from '../models/Maintenance.js'
import Schedule from '../models/Schedule.js'
import Route from '../models/Route.js'

// @desc    Get depot dashboard summary
// @route   GET /api/dashboard
// @access  Protected
export const getDashboardSummary = async (req, res) => {
  try {
    // ── Bus stats ──────────────────────────────────────────────────────────
    const allBuses = await Bus.find({}).lean()

    const buses = {
      total: allBuses.length,
      available: allBuses.filter((b) => b.status === 'available').length,
      inService: allBuses.filter((b) => b.status === 'in-service').length,
      maintenance: allBuses.filter((b) => b.status === 'maintenance').length,
      byServiceType: {
        express:    allBuses.filter((b) => b.serviceType === 'express').length,
        ordinary:   allBuses.filter((b) => b.serviceType === 'ordinary').length,
        semiLuxury: allBuses.filter((b) => b.serviceType === 'semi-luxury').length,
      },
    }

    // ── Driver stats ───────────────────────────────────────────────────────
    const allDrivers = await Driver.find({}).lean()

    const drivers = {
      total: allDrivers.length,
      onDuty: allDrivers.filter((d) => d.status === 'available').length,
    }

    // ── Maintenance alerts (buses currently in maintenance status) ─────────
    const maintenanceRecords = await Maintenance.find({})
      .populate('bus_id', 'regNumber status')
      .sort({ service_date: -1 })
      .lean()

    const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0)

    // alerts = maintenance records where the referenced bus is in maintenance status
    const alerts = maintenanceRecords
      .filter((r) => r.bus_id?.status === 'maintenance')
      .slice(0, 5)
      .map((r) => ({
        _id: r._id,
        busReg: r.bus_id?.regNumber || '—',
        description: r.description,
        service_date: r.service_date,
        cost: r.cost,
      }))

    const maintenance = {
      total: maintenanceRecords.length,
      totalCost: totalMaintenanceCost,
      alerts,
    }

    // ── Active routes count ────────────────────────────────────────────────
    const totalRoutes = await Route.countDocuments({ status: 'active' })

    // ── Trip completion % ──────────────────────────────────────────────────
    // Only count operational statuses (exclude draft/pending/approved which are not yet active)
    const operationalStatuses = ['scheduled', 'on-time', 'delayed', 'completed', 'cancelled']
    const totalOperational = await Schedule.countDocuments({
      status: { $in: operationalStatuses },
    })
    const completedCount = await Schedule.countDocuments({ status: 'completed' })
    const tripCompletion = totalOperational > 0
      ? Math.round((completedCount / totalOperational) * 100)
      : 0

    // ── Recent schedules for trip status table ─────────────────────────────
    // Show most recent 8 schedules that are in an active/operational state
    const schedules = await Schedule.find({
      status: { $in: ['scheduled', 'on-time', 'delayed', 'completed'] },
    })
      .populate('routeId', 'routeName startPoint endPoint')
      .populate('busId', 'regNumber')
      .populate('driverId', 'name')
      .sort({ tripDate: -1, departureTime: -1 })
      .limit(8)
      .lean()

    const recentSchedules = schedules.map((s) => ({
      _id: s._id,
      routeName: s.routeId?.routeName || '—',
      driverName: s.driverId?.name || '—',
      busReg: s.busId?.regNumber || '—',
      departureTime: s.departureTime,
      arrivalTime: s.arrivalTime,
      tripDate: s.tripDate,
      status: s.status,
    }))

    res.json({
      buses,
      drivers,
      maintenance,
      recentSchedules,
      totalRoutes,
      tripCompletion,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
