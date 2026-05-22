import Schedule from '../models/Schedule.js'
import Route from '../models/Route.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import {
  timesOverlap,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  validateTimeRange,
} from '../utils/scheduleHelpers.js'
import { isWithinWorkingHoursAtTime } from '../utils/fleetHelpers.js'

const routePopulate = { path: 'routeId', select: 'routeName startPoint endPoint distance serviceType' }
const busPopulate = { path: 'busId', select: 'regNumber capacity status serviceType' }
const driverPopulate = { path: 'driverId', select: 'name licenseNo contactNo workingHours status' }

const populateSchedule = (query) =>
  query.populate(routePopulate).populate(busPopulate).populate(driverPopulate)

async function findConflicts({
  tripDate,
  routeId,
  busId,
  driverId,
  departureTime,
  arrivalTime,
  excludeId,
}) {
  const dayStart = startOfDay(tripDate)
  const dayEnd = endOfDay(tripDate)
  const filter = {
    tripDate: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: 'cancelled' },
  }
  if (excludeId) filter._id = { $ne: excludeId }

  const sameDay = await Schedule.find(filter)
  const conflicts = []

  for (const existing of sameDay) {
    const overlap = timesOverlap(
      departureTime,
      arrivalTime,
      existing.departureTime,
      existing.arrivalTime
    )
    if (!overlap) continue

    if (String(existing.busId) === String(busId)) {
      conflicts.push({
        type: 'bus',
        message: `Bus already scheduled ${existing.departureTime}–${existing.arrivalTime} on this date`,
        scheduleId: existing._id,
      })
    }
    if (String(existing.driverId) === String(driverId)) {
      conflicts.push({
        type: 'driver',
        message: `Driver already scheduled ${existing.departureTime}–${existing.arrivalTime} on this date`,
        scheduleId: existing._id,
      })
    }
    if (
      routeId &&
      String(existing.routeId) === String(routeId)
    ) {
      conflicts.push({
        type: 'route',
        message: `Route already has a trip ${existing.departureTime}–${existing.arrivalTime} on this date`,
        scheduleId: existing._id,
      })
    }
  }

  return conflicts
}

async function validateAssignment({ busId, driverId, departureTime, routeId }) {
  const bus = await Bus.findById(busId)
  if (!bus) {
    const error = new Error('Bus not found')
    error.statusCode = 400
    throw error
  }
  if (bus.status === 'maintenance') {
    const error = new Error('Bus is under maintenance')
    error.statusCode = 400
    throw error
  }
  if (bus.status !== 'available' && bus.status !== 'in-service') {
    const error = new Error(`Bus is not available (status: ${bus.status})`)
    error.statusCode = 400
    throw error
  }

  if (routeId) {
    const route = await Route.findById(routeId).select('serviceType')
    if (route?.serviceType && bus.serviceType && route.serviceType !== bus.serviceType) {
      const error = new Error(
        `Bus service type (${bus.serviceType}) does not match route (${route.serviceType})`
      )
      error.statusCode = 400
      throw error
    }
  }

  const driver = await Driver.findById(driverId)
  if (!driver) {
    const error = new Error('Driver not found')
    error.statusCode = 400
    throw error
  }
  if (driver.status && driver.status !== 'available') {
    const error = new Error(`Driver is not available (status: ${driver.status})`)
    error.statusCode = 400
    throw error
  }
  if (!isWithinWorkingHoursAtTime(driver.workingHours, departureTime)) {
    const error = new Error(
      `Driver is outside working hours for ${departureTime} (${driver.workingHours || 'not set'})`
    )
    error.statusCode = 400
    throw error
  }

  return { bus, driver }
}

export const getSchedules = async (req, res) => {
  try {
    const { tripDate, fromDate, toDate, view, routeId, busId, driverId, status } = req.query
    const filter = {}

    if (req.user?.role === 'driver' && req.user?.driverId) {
      filter.driverId = req.user.driverId
    } else {
      if (routeId) filter.routeId = routeId
      if (busId) filter.busId = busId
      if (driverId) filter.driverId = driverId
    }
    if (status) filter.status = status

    if (fromDate && toDate) {
      filter.tripDate = { $gte: startOfDay(fromDate), $lte: endOfDay(toDate) }
    } else if (view === 'weekly' && tripDate) {
      filter.tripDate = { $gte: startOfWeek(tripDate), $lte: endOfWeek(tripDate) }
    } else if (view === 'monthly' && tripDate) {
      filter.tripDate = { $gte: startOfMonth(tripDate), $lte: endOfMonth(tripDate) }
    } else if (tripDate) {
      filter.tripDate = { $gte: startOfDay(tripDate), $lte: endOfDay(tripDate) }
    }

    const schedules = await populateSchedule(
      Schedule.find(filter).sort({ tripDate: 1, departureTime: 1 })
    )
    res.json(schedules)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getScheduleById = async (req, res) => {
  try {
    const schedule = await populateSchedule(Schedule.findById(req.params.id))
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' })
    res.json(schedule)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const createSchedule = async (req, res) => {
  try {
    const {
      routeId,
      busId,
      driverId,
      departureTime,
      arrivalTime,
      tripDate,
      status,
      adjustmentReason,
      createdBy,
    } = req.body

    if (!routeId || !busId || !driverId || !departureTime || !arrivalTime || !tripDate) {
      return res.status(400).json({
        message: 'routeId, busId, driverId, departureTime, arrivalTime, and tripDate are required',
      })
    }

    const timeError = validateTimeRange(departureTime, arrivalTime)
    if (timeError) return res.status(400).json({ message: timeError })

    const route = await Route.findById(routeId)
    if (!route) return res.status(400).json({ message: 'Route not found' })

    await validateAssignment({ busId, driverId, departureTime, routeId })

    const conflicts = await findConflicts({
      tripDate,
      routeId,
      busId,
      driverId,
      departureTime,
      arrivalTime,
    })
    if (conflicts.length) {
      return res.status(409).json({ message: 'Schedule conflict detected', conflicts })
    }

    const schedule = await Schedule.create({
      routeId,
      busId,
      driverId,
      departureTime,
      arrivalTime,
      tripDate,
      status: status || 'draft',
      adjustmentReason: adjustmentReason || 'normal',
      createdBy: createdBy || req.user?.id,
    })

    const populated = await populateSchedule(Schedule.findById(schedule._id))
    res.status(201).json(populated)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

export const updateSchedule = async (req, res) => {
  try {
    const existing = await Schedule.findById(req.params.id)
    if (!existing) return res.status(404).json({ message: 'Schedule not found' })

    const data = { ...req.body }
    const routeId = data.routeId ?? existing.routeId
    const busId = data.busId ?? existing.busId
    const driverId = data.driverId ?? existing.driverId
    const departureTime = data.departureTime ?? existing.departureTime
    const arrivalTime = data.arrivalTime ?? existing.arrivalTime
    const tripDate = data.tripDate ?? existing.tripDate

    const timeError = validateTimeRange(departureTime, arrivalTime)
    if (timeError) return res.status(400).json({ message: timeError })

    if (data.reason && !data.adjustmentReason) {
      data.adjustmentReason = data.reason
      delete data.reason
    }

    if (data.routeId) {
      const route = await Route.findById(routeId)
      if (!route) return res.status(400).json({ message: 'Route not found' })
    }

    await validateAssignment({ busId, driverId, departureTime, routeId })

    const conflicts = await findConflicts({
      tripDate,
      routeId,
      busId,
      driverId,
      departureTime,
      arrivalTime,
      excludeId: req.params.id,
    })
    if (conflicts.length) {
      return res.status(409).json({ message: 'Schedule conflict detected', conflicts })
    }

    await Schedule.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
    const populated = await populateSchedule(Schedule.findById(req.params.id))
    res.json(populated)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

export const deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id)
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' })
    res.json({ message: 'Schedule removed', id: schedule._id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const submitSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' })
    if (!['draft', 'pending'].includes(schedule.status)) {
      return res.status(400).json({ message: 'Only draft schedules can be submitted' })
    }

    const conflicts = await findConflicts({
      tripDate: schedule.tripDate,
      routeId: schedule.routeId,
      busId: schedule.busId,
      driverId: schedule.driverId,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      excludeId: schedule._id,
    })
    if (conflicts.length) {
      return res.status(409).json({ message: 'Schedule conflict detected', conflicts })
    }

    schedule.status = 'pending'
    schedule.submittedAt = new Date()
    schedule.rejectionReason = undefined
    await schedule.save()
    const populated = await populateSchedule(Schedule.findById(schedule._id))
    res.json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const approveSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' })
    if (schedule.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending schedules can be approved' })
    }
    schedule.status = 'approved'
    schedule.approvedBy = req.user?.id
    schedule.rejectionReason = undefined
    await schedule.save()
    const populated = await populateSchedule(Schedule.findById(schedule._id))
    res.json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const rejectSchedule = async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason?.trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' })
    }
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' })
    if (schedule.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending schedules can be rejected' })
    }
    schedule.status = 'draft'
    schedule.rejectionReason = reason.trim()
    await schedule.save()
    const populated = await populateSchedule(Schedule.findById(schedule._id))
    res.json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const checkScheduleConflicts = async (req, res) => {
  try {
    const { tripDate, routeId, busId, driverId, departureTime, arrivalTime, excludeId } =
      req.query
    if (!tripDate || !busId || !driverId || !departureTime || !arrivalTime) {
      return res.status(400).json({
        message: 'tripDate, busId, driverId, departureTime, and arrivalTime are required',
      })
    }
    const conflicts = await findConflicts({
      tripDate,
      routeId,
      busId,
      driverId,
      departureTime,
      arrivalTime,
      excludeId,
    })
    res.json({ hasConflict: conflicts.length > 0, conflicts })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
