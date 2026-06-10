import Schedule from '../models/Schedule.js'
import Route from '../models/Route.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import {
  timesOverlap,
  resourceWindowsOverlap,
  getResourceBusyEndTime,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  normalizeTripDate,
  normalizeTimetableAnchor,
  parseTimetableMeta,
  validateTimeRange,
  validateTimetableRows,
  requiresAdjustmentNotes,
  reasonToStatus,
  DRIVER_VISIBLE_STATUSES,
  isDriverVisibleStatus,
  sameAssignedResource,
  toConflictTrip,
} from '../utils/scheduleHelpers.js'
import {
  getDriverLicenseInvalidReason,
  isTripWithinWorkingHours,
} from '../utils/fleetHelpers.js'
import { resolveScheduleTimes } from '../utils/timeFormat.js'
import { syncBusStatusForBusId, syncDriverStatusForDriverId } from '../utils/fleetAssignmentHelpers.js'
import {
  assertDepotAccess,
  isDriver,
  isSuperadministrator,
  requireUserDepot,
} from '../utils/depotAccess.js'
import { notifyDriverIssueReport } from '../utils/notifyDriverIssue.js'

const routePopulate = {
  path: 'routeId',
  select: 'routeName startPoint endPoint distance serviceType stops viaDescription',
}
const busPopulate = { path: 'busId', select: 'regNumber capacity status serviceType' }
const driverPopulate = {
  path: 'driverId',
  select: 'name licenseNo licenseExpiry contactNo workingHours status',
}

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

async function getScopedRouteIds(user) {
  if (isSuperadministrator(user) || isDriver(user)) return null
  const depotId = requireUserDepot(user)
  const routes = await Route.find({ depotId }).select('_id')
  return routes.map((route) => route._id)
}

async function getAccessibleRoute(user, routeId) {
  const route = await Route.findById(routeId)
  if (!route) {
    const error = new Error('Route not found')
    error.statusCode = 400
    throw error
  }
  assertDepotAccess(user, route.depotId, 'Not allowed to access schedules for this depot')
  return route
}

async function assertScheduleAccess(user, schedule) {
  if (isDriver(user)) {
    if (String(schedule.driverId) !== String(user.driverId)) {
      const error = new Error('Not allowed to access this schedule')
      error.statusCode = 403
      throw error
    }
    if (!isDriverVisibleStatus(schedule.status)) {
      const error = new Error('This trip is not yet approved for driver view')
      error.statusCode = 403
      throw error
    }
    return null
  }

  const route = await Route.findById(schedule.routeId).select('depotId routeName serviceType status')
  if (!route) {
    const error = new Error('Route not found')
    error.statusCode = 400
    throw error
  }
  assertDepotAccess(user, route.depotId, 'Not allowed to access schedules for this depot')
  return route
}

async function syncBusServiceType(busId, serviceType) {
  if (!busId || !serviceType) return
  await Bus.findByIdAndUpdate(busId, { serviceType })
}

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
    const busOverlap = resourceWindowsOverlap(
      departureTime,
      arrivalTime,
      existing.departureTime,
      existing.arrivalTime
    )
    const routeOverlap = timesOverlap(
      departureTime,
      arrivalTime,
      existing.departureTime,
      existing.arrivalTime
    )

    if (busOverlap && sameAssignedResource(busId, existing.busId)) {
      const busyEnd = getResourceBusyEndTime(existing.departureTime, existing.arrivalTime)
      conflicts.push({
        type: 'bus',
        message: busyEnd
          ? `Bus busy until ${busyEnd} after ${existing.departureTime}–${existing.arrivalTime} trip on this date`
          : `Bus already scheduled ${existing.departureTime}–${existing.arrivalTime} on this date`,
        scheduleId: existing._id,
      })
    }
    if (busOverlap && sameAssignedResource(driverId, existing.driverId)) {
      const busyEnd = getResourceBusyEndTime(existing.departureTime, existing.arrivalTime)
      conflicts.push({
        type: 'driver',
        message: busyEnd
          ? `Driver busy until ${busyEnd} after ${existing.departureTime}–${existing.arrivalTime} trip on this date`
          : `Driver already scheduled ${existing.departureTime}–${existing.arrivalTime} on this date`,
        scheduleId: existing._id,
      })
    }
    if (routeOverlap && routeId && sameAssignedResource(routeId, existing.routeId)) {
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

function pushStructuredOverlap(conflicts, type, proposed, other, { tripDate, otherLabel, otherRouteId }) {
  const otherRouteName = otherLabel || other.routeName || 'Another trip'
  const otherId = otherRouteId || other.routeId
  const dedupeKey = `${tripDate}|${type}|${proposed.routeId}|${otherId}|${proposed.departureTime}|${other.departureTime}`
  if (conflicts.some((c) => c._dedupeKey === dedupeKey)) return
  conflicts.push({
    _dedupeKey: dedupeKey,
    type,
    tripDate,
    departureTime: proposed.departureTime,
    arrivalTime: proposed.arrivalTime,
    otherRouteId: otherId,
    otherRouteName,
    otherDepartureTime: other.departureTime,
    otherArrivalTime: other.arrivalTime,
  })
}

function compareTripOverlap(proposed, other, conflicts, { tripDate, otherLabel, otherRouteId } = {}) {
  const a = toConflictTrip(proposed)
  const b = toConflictTrip(other)

  if (resourceWindowsOverlap(a.departureTime, a.arrivalTime, b.departureTime, b.arrivalTime)) {
    if (sameAssignedResource(a.busId, b.busId)) {
      pushStructuredOverlap(conflicts, 'bus', a, b, { tripDate, otherLabel, otherRouteId })
    }
    if (sameAssignedResource(a.driverId, b.driverId)) {
      pushStructuredOverlap(conflicts, 'driver', a, b, { tripDate, otherLabel, otherRouteId })
    }
  }

  if (timesOverlap(a.departureTime, a.arrivalTime, b.departureTime, b.arrivalTime)) {
    if (a.routeId && sameAssignedResource(a.routeId, b.routeId)) {
      pushStructuredOverlap(conflicts, 'route', a, b, { tripDate, otherLabel, otherRouteId })
    }
  }
}

function mergeTimetableIssue(issues, trip, dateStr, newConflicts) {
  if (!newConflicts.length) return
  let block = issues.find((i) => String(i.routeId) === String(trip.routeId) && i.tripDate === dateStr)
  if (!block) {
    block = {
      routeId: trip.routeId,
      routeName: trip.routeName,
      tripDate: dateStr,
      conflicts: [],
    }
    issues.push(block)
  }
  for (const c of newConflicts) {
    if (!block.conflicts.some((x) => x._dedupeKey && x._dedupeKey === c._dedupeKey)) {
      block.conflicts.push(c)
    }
  }
}

function countTimetableConflictSummaries(issues) {
  const seen = new Set()
  let count = 0
  for (const issue of issues) {
    if (issue.routeName === 'Validation') continue
    for (const c of issue.conflicts || []) {
      const routeIdA = String(issue.routeId)
      const routeIdB = String(c.otherRouteId || c.otherRouteName || 'other')
      const [idA, idB] = [routeIdA, routeIdB].sort()
      const tripDate = c.tripDate || issue.tripDate || ''
      const times = [c.departureTime || '', c.otherDepartureTime || ''].sort().join('|')
      const pairKey = `${tripDate}|${idA}|${idB}|${times}`
      if (seen.has(pairKey)) continue
      seen.add(pairKey)
      count += 1
    }
  }
  return count
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

  const busIds = [...new Set(included.map((r) => String(r.busId)))]
  const buses = await Bus.find({ _id: { $in: busIds } }).select('status regNumber').lean()
  const busById = new Map(buses.map((b) => [String(b._id), b]))

  const issues = []

  for (const dateStr of dates) {
    const proposedForDay = included.map((r) => toConflictTrip(r))

    const existingForDay = existing.filter((e) => isSameCalendarDay(e.tripDate, dateStr))

    for (let i = 0; i < proposedForDay.length; i++) {
      for (let j = i + 1; j < proposedForDay.length; j++) {
        const a = proposedForDay[i]
        const b = proposedForDay[j]
        const pairConflicts = []
        compareTripOverlap(a, b, pairConflicts, {
          tripDate: dateStr,
          otherLabel: b.routeName,
          otherRouteId: b.routeId,
        })
        mergeTimetableIssue(issues, a, dateStr, pairConflicts)
      }
    }

    for (const trip of proposedForDay) {
      const bus = busById.get(String(trip.busId))
      if (bus?.status === 'maintenance') {
        mergeTimetableIssue(issues, trip, dateStr, [
          {
            type: 'availability',
            message: `Bus ${bus.regNumber} is under maintenance`,
            _dedupeKey: `maintenance-${trip.busId}-${dateStr}`,
          },
        ])
        continue
      }

      const conflicts = []
      for (const ex of existingForDay) {
        compareTripOverlap(trip, ex, conflicts, {
          tripDate: dateStr,
          otherLabel: ex.routeId?.routeName || 'existing schedule',
          otherRouteId: ex.routeId,
        })
      }
      mergeTimetableIssue(issues, trip, dateStr, conflicts)
    }
  }

  const conflictCount = countTimetableConflictSummaries(issues)
  return { hasConflict: issues.length > 0, issues, conflictCount }
}

async function validateAssignment({
  busId,
  driverId,
  departureTime,
  arrivalTime,
  routeId,
  routeDepotId,
  tripDate,
  scheduleId,
}) {
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
  if (routeDepotId && bus.depotId && String(bus.depotId) !== String(routeDepotId)) {
    const error = new Error('Bus belongs to a different depot')
    error.statusCode = 400
    throw error
  }

  const driver = await Driver.findById(driverId)
  if (!driver) {
    const error = new Error('Driver not found')
    error.statusCode = 400
    throw error
  }
  if (driver.status && driver.status !== 'available') {
    const assignedOnThisTrip =
      scheduleId &&
      (await Schedule.exists({
        _id: scheduleId,
        driverId,
      }))
    if (!assignedOnThisTrip) {
      const error = new Error(`Driver is not available (status: ${driver.status})`)
      error.statusCode = 400
      throw error
    }
  }
  if (!isTripWithinWorkingHours(driver.workingHours, departureTime, arrivalTime)) {
    const error = new Error(
      `Driver is outside working hours for ${departureTime}–${arrivalTime} (${driver.workingHours || 'not set'})`
    )
    error.statusCode = 400
    throw error
  }
  const licenseIssue = getDriverLicenseInvalidReason(driver, tripDate || new Date())
  if (licenseIssue) {
    const error = new Error(licenseIssue)
    error.statusCode = 400
    throw error
  }
  if (routeDepotId && driver.depotId && String(driver.depotId) !== String(routeDepotId)) {
    const error = new Error('Driver belongs to a different depot')
    error.statusCode = 400
    throw error
  }

  return { bus, driver }
}

export const getSchedules = async (req, res) => {
  try {
    const {
      tripDate,
      fromDate,
      toDate,
      view,
      routeId,
      busId,
      driverId,
      status,
      timetableId,
      timetablePeriod,
      timetableAnchor,
      driverIssues,
    } = req.query
    const filter = {}

    if (isDriver(req.user) && req.user?.driverId) {
      filter.driverId = req.user.driverId
      filter.status = { $in: DRIVER_VISIBLE_STATUSES }
    } else {
      const scopedRouteIds = await getScopedRouteIds(req.user)
      if (scopedRouteIds) filter.routeId = { $in: scopedRouteIds }
      if (routeId) {
        if (scopedRouteIds && !scopedRouteIds.some((id) => String(id) === String(routeId))) {
          filter.routeId = null
        } else {
          filter.routeId = routeId
        }
      }
      if (busId) filter.busId = busId
      if (driverId) filter.driverId = driverId
    }
    if (driverIssues === 'true') {
      if (isDriver(req.user)) {
        return res.status(403).json({ message: 'Not allowed to list driver issues' })
      }
      filter.status = 'delayed'
      filter.$or = [
        { driverIssueReportedAt: { $ne: null } },
        { driverIssueNotes: { $exists: true, $nin: [null, ''] } },
      ]
    } else if (status === 'rejected') {
      filter.status = 'draft'
      filter.rejectionReason = { $exists: true, $ne: '' }
    } else if (status) {
      filter.status = status
    }

    if (timetableId) filter.timetableId = String(timetableId).trim()
    if (timetablePeriod) filter.timetablePeriod = timetablePeriod
    if (timetableAnchor) {
      const period = timetablePeriod || 'daily'
      filter.timetableAnchor = normalizeTimetableAnchor(period, timetableAnchor)
    }

    if (fromDate && toDate) {
      filter.tripDate = { $gte: startOfDay(fromDate), $lte: endOfDay(toDate) }
    } else if (view === 'weekly' && tripDate) {
      filter.tripDate = { $gte: startOfWeek(tripDate), $lte: endOfWeek(tripDate) }
    } else if (view === 'monthly' && tripDate) {
      filter.tripDate = { $gte: startOfMonth(tripDate), $lte: endOfMonth(tripDate) }
    } else if (tripDate) {
      filter.tripDate = { $gte: startOfDay(tripDate), $lte: endOfDay(tripDate) }
    }

    let sort = { tripDate: 1, departureTime: 1 }
    if (driverIssues === 'true') {
      sort = { driverIssueReportedAt: -1, updatedAt: -1, tripDate: -1 }
    } else if (status === 'pending') {
      sort = { receivedAt: -1, submittedAt: -1, createdAt: -1 }
    } else if (status === 'rejected') {
      sort = { rejectedAt: -1, updatedAt: -1, createdAt: -1 }
    }

    const schedules = await populateSchedule(Schedule.find(filter).sort(sort))
    res.json(schedules)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getScheduleById = async (req, res) => {
  try {
    const rawSchedule = await Schedule.findById(req.params.id)
    if (rawSchedule) await assertScheduleAccess(req.user, rawSchedule)
    const schedule = await populateSchedule(Schedule.findById(req.params.id))
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' })
    res.json(schedule)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
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

    const {
      departureTime: normalizedDepartureTime,
      arrivalTime: normalizedArrivalTime,
    } = resolveScheduleTimes(departureTime, arrivalTime, validateTimeRange)

    const route = await getAccessibleRoute(req.user, routeId)
    if (route.status && route.status !== 'active') {
      return res.status(400).json({
        message: `Route "${route.routeName}" is ${route.status} and cannot be scheduled`,
      })
    }

    const normalizedTripDate = normalizeTripDate(tripDate)

    await validateAssignment({
      busId,
      driverId,
      departureTime: normalizedDepartureTime,
      arrivalTime: normalizedArrivalTime,
      routeId,
      routeDepotId: route.depotId,
      tripDate: normalizedTripDate,
    })

    const conflicts = await findConflicts({
      tripDate: normalizedTripDate,
      routeId,
      busId,
      driverId,
      departureTime: normalizedDepartureTime,
      arrivalTime: normalizedArrivalTime,
    })
    if (conflicts.length) {
      return res.status(409).json({ message: 'Schedule conflict detected', conflicts })
    }

    const allowedCreateStatuses = ['draft', 'pending']
    const nextStatus = allowedCreateStatuses.includes(status) ? status : 'draft'
    const timetableMeta = parseTimetableMeta(req.body)
    const submittedNow = nextStatus === 'pending' ? new Date() : undefined

    const schedule = await Schedule.create({
      routeId,
      busId,
      driverId,
      departureTime: normalizedDepartureTime,
      arrivalTime: normalizedArrivalTime,
      tripDate: normalizedTripDate,
      status: nextStatus,
      submittedAt: submittedNow,
      receivedAt: submittedNow,
      adjustmentReason: adjustmentReason || 'normal',
      createdBy: createdBy || req.user?.id,
      ...(timetableMeta || {}),
    })

    await syncBusServiceType(busId, route.serviceType)
    await syncBusStatusForBusId(busId)

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
    const scopedRoute = await assertScheduleAccess(req.user, existing)

    const data = { ...req.body }
    const routeId = data.routeId ?? existing.routeId
    const busId = data.busId ?? existing.busId
    const driverId = data.driverId ?? existing.driverId
    const departureTime = data.departureTime ?? existing.departureTime
    const arrivalTime = data.arrivalTime ?? existing.arrivalTime
    const tripDate = data.tripDate ?? existing.tripDate
    const normalizedTripDate = normalizeTripDate(tripDate)
    if (data.tripDate !== undefined) data.tripDate = normalizedTripDate

    const {
      departureTime: normalizedDepartureTime,
      arrivalTime: normalizedArrivalTime,
    } = resolveScheduleTimes(departureTime, arrivalTime, validateTimeRange)
    if (data.departureTime !== undefined) data.departureTime = normalizedDepartureTime
    if (data.arrivalTime !== undefined) data.arrivalTime = normalizedArrivalTime

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

    const nextStatus = data.status ?? existing.status
    const isCancellation = nextStatus === 'cancelled'

    if (data.routeId) {
      await getAccessibleRoute(req.user, routeId)
    }

    const assignmentRoute = data.routeId
      ? await getAccessibleRoute(req.user, routeId)
      : scopedRoute

    if (!isCancellation) {
      await validateAssignment({
        busId,
        driverId,
        departureTime: normalizedDepartureTime,
        arrivalTime: normalizedArrivalTime,
        routeId,
        routeDepotId: assignmentRoute?.depotId,
        tripDate: normalizedTripDate,
        scheduleId: req.params.id,
      })

      const conflicts = await findConflicts({
        tripDate: normalizedTripDate,
        routeId,
        busId,
        driverId,
        departureTime: normalizedDepartureTime,
        arrivalTime: normalizedArrivalTime,
        excludeId: req.params.id,
      })
      if (conflicts.length) {
        return res.status(409).json({ message: 'Schedule conflict detected', conflicts })
      }
    }

    const previousBusId = existing.busId

    appendAdjustmentHistory(existing, data, req.user?.id)
    Object.assign(existing, data)
    if (data.status && data.status !== 'delayed') {
      existing.driverIssueReportedAt = null
      existing.driverIssueNotes = ''
    }
    await existing.save()
    await syncBusServiceType(busId, assignmentRoute?.serviceType)
    await syncBusStatusForBusId(busId)
    if (previousBusId && String(previousBusId) !== String(busId)) {
      await syncBusStatusForBusId(previousBusId)
    }
    const populated = await populateSchedule(Schedule.findById(req.params.id))
    res.json(populated)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

export const deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' })
    await assertScheduleAccess(req.user, schedule)
    const busId = schedule.busId
    await schedule.deleteOne()
    await syncBusStatusForBusId(busId)
    res.json({ message: 'Schedule removed', id: schedule._id })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

export const submitSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' })
    await assertScheduleAccess(req.user, schedule)
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

    const submittedNow = new Date()
    schedule.status = 'pending'
    schedule.submittedAt = submittedNow
    schedule.receivedAt = submittedNow
    schedule.rejectionReason = undefined
    schedule.rejectedAt = undefined
    schedule.approvedAt = undefined
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
    const route = await assertScheduleAccess(req.user, schedule)
    if (schedule.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending schedules can be approved' })
    }

    await validateAssignment({
      busId: schedule.busId,
      driverId: schedule.driverId,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      routeId: schedule.routeId,
      routeDepotId: route?.depotId,
      tripDate: schedule.tripDate,
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

    schedule.status = 'scheduled'
    schedule.approvedBy = req.user?.id
    schedule.approvedAt = new Date()
    schedule.rejectionReason = undefined
    schedule.rejectedAt = undefined
    await schedule.save()
    await syncBusServiceType(schedule.busId, route?.serviceType)
    await syncBusStatusForBusId(schedule.busId)
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
    await assertScheduleAccess(req.user, schedule)
    if (schedule.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending schedules can be rejected' })
    }
    schedule.status = 'draft'
    schedule.rejectionReason = reason.trim()
    schedule.rejectedAt = new Date()
    schedule.approvedAt = undefined
    await schedule.save()
    const populated = await populateSchedule(Schedule.findById(schedule._id))
    res.json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const DRIVER_TRIP_STATUS_TARGETS = new Set(['on-duty', 'on-time', 'delayed', 'completed'])
const DRIVER_TRIP_STATUS_SOURCES = new Set(['approved', 'scheduled', 'on-duty', 'on-time', 'delayed'])

export const updateDriverTripStatus = async (req, res) => {
  try {
    if (!isDriver(req.user)) {
      return res.status(403).json({ message: 'Only drivers can update trip status here' })
    }

    const { status } = req.body
    if (!status || !DRIVER_TRIP_STATUS_TARGETS.has(status)) {
      return res.status(400).json({ message: 'Status must be on-duty, on-time, delayed, or completed' })
    }

    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' })
    await assertScheduleAccess(req.user, schedule)

    if (!DRIVER_TRIP_STATUS_SOURCES.has(schedule.status)) {
      return res.status(400).json({ message: 'This trip status cannot be changed' })
    }

    const statusLabel = {
      'on-duty': 'on duty',
      'on-time': 'on time',
      delayed: 'delayed',
      completed: 'completed',
    }[status]
    let notes = req.body.notes?.trim()
    let adjustmentReason = 'normal'

    if (status === 'delayed') {
      if (!notes) {
        return res.status(400).json({ message: 'Please describe the issue before reporting' })
      }
      adjustmentReason = 'obstruction'
      schedule.driverIssueReportedAt = new Date()
      schedule.driverIssueNotes = notes
    } else if (status === 'completed') {
      schedule.driverIssueReportedAt = null
      schedule.driverIssueNotes = ''
    } else if (status === 'on-duty') {
      notes = notes || 'Driver started trip — on duty'
    } else if (status === 'on-time') {
      notes = notes || 'Driver acknowledged trip'
    } else {
      notes = notes || `Driver marked trip as ${statusLabel}`
    }

    if (schedule.status === status && status !== 'delayed') {
      return res.status(400).json({ message: 'Trip is already in that status' })
    }

    if (schedule.status === status && status === 'delayed') {
      schedule.adjustmentReason = adjustmentReason
      schedule.adjustmentNotes = notes
      await schedule.save()
      await syncBusStatusForBusId(schedule.busId)
      await syncDriverStatusForDriverId(schedule.driverId, schedule.tripDate)
      try {
        await notifyDriverIssueReport({ schedule, notes })
      } catch (notifyError) {
        console.error('Failed to notify scheduler/admin of driver issue:', notifyError)
      }
      const populated = await populateSchedule(Schedule.findById(schedule._id))
      return res.json(populated)
    }

    if (schedule.status === status) {
      return res.status(400).json({ message: 'Trip is already in that status' })
    }

    appendAdjustmentHistory(
      schedule,
      { status, adjustmentReason, adjustmentNotes: notes },
      req.user?.id
    )
    schedule.status = status
    schedule.adjustmentReason = adjustmentReason
    schedule.adjustmentNotes = notes
    await schedule.save()
    await syncBusStatusForBusId(schedule.busId)
    await syncDriverStatusForDriverId(schedule.driverId, schedule.tripDate)

    if (status === 'delayed') {
      try {
        await notifyDriverIssueReport({ schedule, notes })
      } catch (notifyError) {
        console.error('Failed to notify scheduler/admin of driver issue:', notifyError)
      }
    }

    const populated = await populateSchedule(Schedule.findById(schedule._id))
    res.json(populated)
  } catch (error) {
    const statusCode = error.statusCode || 500
    res.status(statusCode).json({ message: error.message })
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
    const {
      departureTime: normalizedDepartureTime,
      arrivalTime: normalizedArrivalTime,
    } = resolveScheduleTimes(departureTime, arrivalTime, validateTimeRange)
    const route = routeId ? await getAccessibleRoute(req.user, routeId) : null
    const availabilityIssues = []
    try {
      await validateAssignment({
        busId,
        driverId,
        departureTime: normalizedDepartureTime,
        arrivalTime: normalizedArrivalTime,
        routeId,
        routeDepotId: route?.depotId,
        tripDate: normalizeTripDate(tripDate),
        scheduleId: excludeId || undefined,
      })
    } catch (err) {
      if (err.statusCode === 400) {
        availabilityIssues.push({ type: 'availability', message: err.message })
      } else {
        throw err
      }
    }
    const conflicts = await findConflicts({
      tripDate,
      routeId,
      busId,
      driverId,
      departureTime: normalizedDepartureTime,
      arrivalTime: normalizedArrivalTime,
      excludeId,
    })
    const combined = [...availabilityIssues, ...conflicts]
    res.json({ hasConflict: combined.length > 0, conflicts: combined })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

function timetableValidationResult(rows) {
  const validationErrors = validateTimetableRows(rows)
  if (!validationErrors.length) return null
  return {
    hasConflict: true,
    issues: [
      {
        routeId: '',
        routeName: 'Validation',
        tripDate: '',
        conflicts: validationErrors.map((message) => ({ type: 'validation', message })),
      },
    ],
    conflictCount: validationErrors.length,
  }
}

export const checkTimetableConflicts = async (req, res) => {
  try {
    const { dates, rows } = req.body
    if (!Array.isArray(dates) || !Array.isArray(rows)) {
      return res.status(400).json({ message: 'dates and rows arrays are required' })
    }
    const validationBlock = timetableValidationResult(rows)
    if (validationBlock) {
      return res.json(validationBlock)
    }
    if (!isSuperadministrator(req.user)) {
      for (const row of rows) {
        await getAccessibleRoute(req.user, row.routeId)
      }
    }
    const result = await analyzeTimetableConflicts({ dates, rows })
    res.json(result)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}
