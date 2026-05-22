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
  requiresAdjustmentNotes,
  reasonToStatus,
} from '../utils/scheduleHelpers.js'
import { isWithinWorkingHoursAtTime } from '../utils/fleetHelpers.js'

const routePopulate = { path: 'routeId', select: 'routeName startPoint endPoint distance serviceType' }
const busPopulate = { path: 'busId', select: 'regNumber capacity status serviceType' }
const driverPopulate = { path: 'driverId', select: 'name licenseNo contactNo workingHours status' }

const historyPopulate = {
  path: 'adjustmentHistory.by',
  select: 'name email role',
}

const populateSchedule = (query) =>
  query
    .populate(routePopulate)
    .populate(busPopulate)
    .populate(driverPopulate)
    .populate(historyPopulate)

function buildHistoryChanges(existing, data) {
  const tracked = [
    'departureTime',
    'arrivalTime',
    'busId',
    'driverId',
    'status',
    'adjustmentReason',
  ]
  const changes = []
  for (const field of tracked) {
    if (data[field] === undefined) continue
    const from = existing[field] != null ? String(existing[field]) : ''
    const to = String(data[field])
    if (from !== to) changes.push({ field, from, to })
  }
  return changes
}

function appendAdjustmentHistory(existing, data, userId) {
  const changes = buildHistoryChanges(existing, data)
  const reason = data.adjustmentReason ?? existing.adjustmentReason
  const notes = data.adjustmentNotes ?? existing.adjustmentNotes ?? ''
  if (!changes.length && !notes.trim()) return

  if (!existing.adjustmentHistory) existing.adjustmentHistory = []
  existing.adjustmentHistory.push({
    at: new Date(),
    by: userId,
    reason,
    notes: notes.trim(),
    changes,
  })
}

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

function isSameCalendarDay(tripDate, dateStr) {
  const a = startOfDay(tripDate).getTime()
  const b = startOfDay(dateStr).getTime()
  return a === b
}

function pushOverlapConflicts(conflicts, type, message) {
  if (!conflicts.some((c) => c.type === type && c.message === message)) {
    conflicts.push({ type, message })
  }
}

function compareTripOverlap(proposed, other, conflicts, { otherLabel = 'another trip' }) {
  if (
    !timesOverlap(
      proposed.departureTime,
      proposed.arrivalTime,
      other.departureTime,
      other.arrivalTime
    )
  ) {
    return
  }
  if (String(proposed.busId) === String(other.busId)) {
    pushOverlapConflicts(
      conflicts,
      'bus',
      `Bus overlap with ${otherLabel} (${other.departureTime}–${other.arrivalTime})`
    )
  }
  if (String(proposed.driverId) === String(other.driverId)) {
    pushOverlapConflicts(
      conflicts,
      'driver',
      `Driver overlap with ${otherLabel} (${other.departureTime}–${other.arrivalTime})`
    )
  }
  if (proposed.routeId && String(proposed.routeId) === String(other.routeId)) {
    pushOverlapConflicts(
      conflicts,
      'route',
      `Route overlap with ${otherLabel} (${other.departureTime}–${other.arrivalTime})`
    )
  }
}

async function analyzeTimetableConflicts({ dates, rows }) {
  const included = (rows || []).filter(
    (r) =>
      r.included !== false &&
      r.routeId &&
      r.busId &&
      r.driverId &&
      r.departureTime &&
      r.arrivalTime &&
      !validateTimeRange(r.departureTime, r.arrivalTime)
  )

  if (!included.length || !dates?.length) {
    return { hasConflict: false, issues: [], conflictCount: 0 }
  }

  const sortedDates = [...dates].sort()
  const rangeStart = startOfDay(sortedDates[0])
  const rangeEnd = endOfDay(sortedDates[sortedDates.length - 1])
  const existing = await Schedule.find({
    tripDate: { $gte: rangeStart, $lte: rangeEnd },
    status: { $ne: 'cancelled' },
  })

  const issues = []

  for (const dateStr of dates) {
    const proposedForDay = included.map((r) => ({
      routeId: String(r.routeId),
      routeName: r.routeName || 'Route',
      busId: String(r.busId),
      driverId: String(r.driverId),
      departureTime: r.departureTime,
      arrivalTime: r.arrivalTime,
    }))

    const existingForDay = existing.filter((e) => isSameCalendarDay(e.tripDate, dateStr))

    for (const trip of proposedForDay) {
      const conflicts = []

      for (const other of proposedForDay) {
        if (other.routeId === trip.routeId) continue
        compareTripOverlap(trip, other, conflicts, { otherLabel: other.routeName })
      }

      for (const ex of existingForDay) {
        compareTripOverlap(trip, ex, conflicts, { otherLabel: 'existing schedule' })
      }

      if (conflicts.length) {
        issues.push({
          routeId: trip.routeId,
          routeName: trip.routeName,
          tripDate: dateStr,
          conflicts,
        })
      }
    }
  }

  const conflictCount = issues.reduce((n, i) => n + i.conflicts.length, 0)
  return { hasConflict: issues.length > 0, issues, conflictCount }
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
    if (route.status && route.status !== 'active') {
      return res.status(400).json({
        message: `Route "${route.routeName}" is ${route.status} and cannot be scheduled`,
      })
    }

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

    const nextReason = data.adjustmentReason ?? existing.adjustmentReason
    const nextNotes = data.adjustmentNotes !== undefined ? data.adjustmentNotes : existing.adjustmentNotes

    if (requiresAdjustmentNotes(nextReason) && !String(nextNotes || '').trim()) {
      return res.status(400).json({
        message: 'A written note is required for emergency, maintenance, absence, or obstruction adjustments',
      })
    }

    if (data.adjustmentReason && data.status === undefined) {
      data.status = reasonToStatus(data.adjustmentReason, existing.status)
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

    appendAdjustmentHistory(existing, data, req.user?.id)
    Object.assign(existing, data)
    await existing.save()
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

    await validateAssignment({
      busId: schedule.busId,
      driverId: schedule.driverId,
      departureTime: schedule.departureTime,
      routeId: schedule.routeId,
    })

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
      return res.status(409).json({
        message: 'Cannot approve: scheduling conflicts detected',
        conflicts,
      })
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

export const checkTimetableConflicts = async (req, res) => {
  try {
    const { dates, rows } = req.body
    if (!Array.isArray(dates) || !Array.isArray(rows)) {
      return res.status(400).json({ message: 'dates and rows arrays are required' })
    }
    const result = await analyzeTimetableConflicts({ dates, rows })
    res.json(result)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}
