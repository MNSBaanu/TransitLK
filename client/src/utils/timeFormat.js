/** Canonical 24-hour time: HH:mm */

export function normalizeTime(value) {
  if (value == null || value === '') return null
  const match = String(value).trim().match(/^(\d{1,2}):(\d{1,2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function normalizeTimeRange(departureTime, arrivalTime) {
  return {
    departureTime: normalizeTime(departureTime),
    arrivalTime: normalizeTime(arrivalTime),
  }
}

/** Stored as "HH:mm - HH:mm" */
export function normalizeWorkingHours(value) {
  if (!value?.trim()) return ''
  const trimmed = String(value).trim()
  if (/off|leave|unavailable/i.test(trimmed)) return trimmed

  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})\s*[-–]\s*(\d{1,2}):(\d{1,2})$/i)
  if (!match) return trimmed

  const start = normalizeTime(`${match[1]}:${match[2]}`)
  const end = normalizeTime(`${match[3]}:${match[4]}`)
  if (!start || !end) return trimmed
  return `${start} - ${end}`
}

export function formatTimeRange(departureTime, arrivalTime) {
  const dep = normalizeTime(departureTime) || '—'
  const arr = normalizeTime(arrivalTime) || '—'
  return `${dep} – ${arr}`
}

export function formatWorkingHoursDisplay(workingHours) {
  const normalized = normalizeWorkingHours(workingHours)
  if (!normalized) return '—'
  if (/off|leave|unavailable/i.test(normalized)) return normalized
  return normalized.replace(' - ', ' – ')
}
