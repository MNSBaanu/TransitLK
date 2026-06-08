const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Parse calendar dates (YYYY-MM-DD) in UTC so storage and queries stay timezone-safe */
function parseDateInput(value) {
  if (!value) return new Date(Number.NaN)
  if (typeof value === 'string' && DATE_ONLY_RE.test(value.trim())) {
    const [y, m, d] = value.trim().split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return d
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0))
}

export function normalizeTripDate(value) {
  const d = parseDateInput(value)
  if (Number.isNaN(d.getTime())) {
    const error = new Error('Invalid trip date')
    error.statusCode = 400
    throw error
  }
  return d
}

const TIMETABLE_PERIODS = new Set(['daily', 'weekly', 'monthly'])

function calendarDateAtNoonUtc(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0)
  )
}

/** Canonical anchor for a timetable batch (week start or 1st of month). */
export function normalizeTimetableAnchor(period, anchorDate) {
  if (!TIMETABLE_PERIODS.has(period)) {
    const error = new Error('Invalid timetable period')
    error.statusCode = 400
    throw error
  }
  if (period === 'weekly') {
    return calendarDateAtNoonUtc(startOfWeek(anchorDate))
  }
  if (period === 'monthly') {
    const d = parseDateInput(anchorDate)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 12, 0, 0, 0))
  }
  return normalizeTripDate(anchorDate)
}

/** Validate optional timetable grouping fields sent together on create. */
export function parseTimetableMeta(body = {}) {
  const { timetableId, timetablePeriod, timetableAnchor } = body
  const hasAny = Boolean(timetableId || timetablePeriod || timetableAnchor)
  const hasAll = Boolean(timetableId && timetablePeriod && timetableAnchor)

  if (!hasAny) return null

  if (!hasAll) {
    const error = new Error(
      'timetableId, timetablePeriod, and timetableAnchor must be provided together'
    )
    error.statusCode = 400
    throw error
  }

  if (!TIMETABLE_PERIODS.has(timetablePeriod)) {
    const error = new Error('timetablePeriod must be daily, weekly, or monthly')
    error.statusCode = 400
    throw error
  }

  const id = String(timetableId).trim()
  if (!id) {
    const error = new Error('timetableId is required')
    error.statusCode = 400
    throw error
  }

  return {
    timetableId: id,
    timetablePeriod,
    timetableAnchor: normalizeTimetableAnchor(timetablePeriod, timetableAnchor),
  }
}

/** Parse "HH:mm" to minutes from midnight */
export function timeToMinutes(time) {
  if (!time?.trim()) return null
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/** True if two time ranges on the same day overlap */
export function timesOverlap(depA, arrA, depB, arrB) {
  const startA = timeToMinutes(depA)
  const endA = timeToMinutes(arrA)
  const startB = timeToMinutes(depB)
  const endB = timeToMinutes(arrB)
  if ([startA, endA, startB, endB].some((v) => v == null)) return false
  if (endA <= startA || endB <= startB) return false
  return startA < endB && startB < endA
}

export function minutesToTime(minutes) {
  if (minutes == null || minutes < 0) return null
  const capped = Math.min(minutes, 24 * 60 - 1)
  const h = Math.floor(capped / 60)
  const min = capped % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Mirror-outbound turnaround: busy until arrival + (arrival - departure) */
export function getResourceBusyEndMinutes(departureTime, arrivalTime) {
  const dep = timeToMinutes(departureTime)
  const arr = timeToMinutes(arrivalTime)
  if (dep == null || arr == null || arr <= dep) return null
  return arr + (arr - dep)
}

export function getResourceBusyEndTime(departureTime, arrivalTime) {
  const end = getResourceBusyEndMinutes(departureTime, arrivalTime)
  return end == null ? null : minutesToTime(end)
}

/** Bus/driver busy windows including mirrored return journey */
export function resourceWindowsOverlap(depA, arrA, depB, arrB) {
  const startA = timeToMinutes(depA)
  const busyEndA = getResourceBusyEndMinutes(depA, arrA)
  const startB = timeToMinutes(depB)
  const busyEndB = getResourceBusyEndMinutes(depB, arrB)
  if ([startA, busyEndA, startB, busyEndB].some((v) => v == null)) return false
  if (busyEndA <= startA || busyEndB <= startB) return false
  return startA < busyEndB && startB < busyEndA
}

/** Normalize bus/driver/route ids from strings, ObjectIds, or populated docs */
export function normalizeResourceId(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'object' && value._id != null) return String(value._id)
  return String(value)
}

export function sameAssignedResource(left, right) {
  const a = normalizeResourceId(left)
  const b = normalizeResourceId(right)
  if (!a || !b) return false
  return a === b
}

export function toConflictTrip(trip = {}) {
  return {
    tripRowId: trip.tripRowId || (trip._id ? String(trip._id) : ''),
    routeId: normalizeResourceId(trip.routeId),
    routeName: trip.routeName || trip.routeId?.routeName,
    busId: normalizeResourceId(trip.busId),
    driverId: normalizeResourceId(trip.driverId),
    departureTime: trip.departureTime,
    arrivalTime: trip.arrivalTime,
  }
}

export function startOfDay(date) {
  const d = parseDateInput(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
}

export function endOfDay(date) {
  const d = parseDateInput(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))
}

export function startOfMonth(date) {
  const d = parseDateInput(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

export function endOfMonth(date) {
  const d = parseDateInput(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999))
}

/** Monday as first day of week (UTC calendar) */
export function startOfWeek(date) {
  const d = parseDateInput(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(d)
  start.setUTCDate(start.getUTCDate() + diff)
  return new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0)
  )
}

export function endOfWeek(date) {
  const d = startOfWeek(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 6, 23, 59, 59, 999))
}

export const DISRUPTION_REASONS = ['emergency', 'maintenance', 'absence', 'obstruction']

export function requiresAdjustmentNotes(reason) {
  return DISRUPTION_REASONS.includes(reason)
}

/** Trips visible to drivers only after depot manager approval */
export const DRIVER_VISIBLE_STATUSES = [
  'approved',
  'scheduled',
  'on-duty',
  'on-time',
  'delayed',
  'completed',
  'cancelled',
]

export function isDriverVisibleStatus(status) {
  return DRIVER_VISIBLE_STATUSES.includes(status)
}

export function reasonToStatus(reason, currentStatus = 'scheduled') {
  if (reason === 'emergency') return 'delayed'
  if (reason === 'maintenance' && currentStatus === 'scheduled') return 'cancelled'
  if (reason === 'absence' || reason === 'obstruction') return 'delayed'
  if (reason === 'normal' && currentStatus === 'cancelled') return currentStatus
  return currentStatus || 'scheduled'
}

export function validateTimeRange(departureTime, arrivalTime) {
  const dep = timeToMinutes(departureTime)
  const arr = timeToMinutes(arrivalTime)
  if (dep == null || arr == null) {
    return 'Departure and arrival must be valid times (HH:mm)'
  }
  if (arr <= dep) {
    return 'Arrival time must be after departure time'
  }
  return null
}

export function getTimetableRowValidationIssues(row) {
  if (row.included === false) return []
  const issues = []
  if (!row.departureTime || !row.arrivalTime) {
    issues.push('Departure and arrival times are required')
  } else {
    const timeErr = validateTimeRange(row.departureTime, row.arrivalTime)
    if (timeErr) issues.push(timeErr)
  }
  if (!row.busId) issues.push('Assign a bus')
  if (!row.driverId) issues.push('Assign a driver')
  return issues
}

export function validateTimetableRows(rows) {
  const errors = []
  const included = (rows || []).filter((r) => r.included !== false)
  if (included.length === 0) {
    return ['Select at least one route for the timetable']
  }
  for (const row of included) {
    const label = row.routeName || 'Route'
    for (const issue of getTimetableRowValidationIssues(row)) {
      const detail = issue.charAt(0).toLowerCase() + issue.slice(1)
      errors.push(`${label}: ${detail}`)
    }
  }
  return errors
}

export function tripDateKey(trip) {
  if (!trip?.tripDate) return ''
  const raw = trip.tripDate
  if (typeof raw === 'string') {
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
  }
  const d = parseDateInput(raw)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function appendOverlapConflicts(a, b, conflicts) {
  if (!timesOverlap(a.departureTime, a.arrivalTime, b.departureTime, b.arrivalTime)) {
    return
  }
  const busA = String(a.busId?._id || a.busId)
  const busB = String(b.busId?._id || b.busId)
  const driverA = String(a.driverId?._id || a.driverId)
  const driverB = String(b.driverId?._id || b.driverId)
  const routeA = String(a.routeId?._id || a.routeId)
  const routeB = String(b.routeId?._id || b.routeId)

  if (busA === busB) {
    conflicts.push({
      type: 'bus',
      a,
      b,
      message: `Bus overlap ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`,
    })
  }
  if (driverA === driverB) {
    conflicts.push({
      type: 'driver',
      a,
      b,
      message: `Driver overlap ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`,
    })
  }
  if (routeA === routeB) {
    conflicts.push({
      type: 'route',
      a,
      b,
      message: `Route overlap ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`,
    })
  }
}

export function detectDayConflicts(schedules) {
  const conflicts = []
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i]
      const b = schedules[j]
      appendOverlapConflicts(a, b, conflicts)
    }
  }
  return conflicts
}

export function detectPeriodConflicts(schedules) {
  const byDay = new Map()
  for (const s of schedules) {
    if (s.status === 'cancelled') continue
    const key = tripDateKey(s)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(s)
  }
  const conflicts = []
  for (const daySchedules of byDay.values()) {
    conflicts.push(...detectDayConflicts(daySchedules))
  }
  return conflicts
}
