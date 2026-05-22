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
  return startA < endB && startB < endA
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function startOfMonth(date) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfMonth(date) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Monday as first day of week */
export function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfWeek(date) {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export const DISRUPTION_REASONS = ['emergency', 'maintenance', 'absence', 'obstruction']

export function requiresAdjustmentNotes(reason) {
  return DISRUPTION_REASONS.includes(reason)
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
