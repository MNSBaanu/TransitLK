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
