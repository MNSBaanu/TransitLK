/** Parse "06:00-18:00" style working hours; returns true if no hours set or currently within range. */
export function isWithinWorkingHours(workingHours) {
  if (!workingHours?.trim()) return true
  if (/off|leave|unavailable/i.test(workingHours)) return false

  const match = workingHours.match(/(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?/i)
  if (!match) return true

  const startH = Number(match[1])
  const startM = Number(match[2] || 0)
  const endH = Number(match[3])
  const endM = Number(match[4] || 0)
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const start = startH * 60 + startM
  let end = endH * 60 + endM
  if (end <= start) end += 24 * 60
  return minutes >= start && minutes < end
}

function isTimeWithinWorkingHours(workingHours, time, { allowEndBoundary = false } = {}) {
  if (!workingHours?.trim()) return true
  if (/off|leave|unavailable/i.test(workingHours)) return false

  const match = workingHours.match(/(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?/i)
  if (!match) return true

  const timeMatch = String(time || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!timeMatch) return true

  const startH = Number(match[1])
  const startM = Number(match[2] || 0)
  const endH = Number(match[3])
  const endM = Number(match[4] || 0)
  const minutes = Number(timeMatch[1]) * 60 + Number(timeMatch[2])
  const start = startH * 60 + startM
  let end = endH * 60 + endM
  if (end <= start) end += 24 * 60
  return allowEndBoundary
    ? minutes >= start && minutes <= end
    : minutes >= start && minutes < end
}

/** Check if departure time (HH:mm) falls within working hours string */
export function isWithinWorkingHoursAtTime(workingHours, departureTime) {
  return isTimeWithinWorkingHours(workingHours, departureTime)
}

/** Check full trip window against driver working hours */
export function isTripWithinWorkingHours(workingHours, departureTime, arrivalTime) {
  return (
    isTimeWithinWorkingHours(workingHours, departureTime) &&
    isTimeWithinWorkingHours(workingHours, arrivalTime, { allowEndBoundary: true })
  )
}

export const SERVICE_MIN_CAPACITY = {
  ordinary: 40,
  express: 35,
  'semi-luxury': 28,
}

export function defaultMinCapacityForService(serviceType) {
  return SERVICE_MIN_CAPACITY[serviceType] ?? 30
}

function startOfCalendarDay(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function formatLicenseExpiryDate(licenseExpiry) {
  if (!licenseExpiry) return '—'
  return new Date(licenseExpiry).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** License must be valid through the given calendar day (inclusive). */
export function isDriverLicenseValid(licenseExpiry, onDate = new Date()) {
  if (!licenseExpiry) return false
  const exp = startOfCalendarDay(licenseExpiry)
  const ref = startOfCalendarDay(onDate)
  if (!exp || !ref) return false
  return exp >= ref
}

export function getDriverLicenseInvalidReason(driver, onDate = new Date()) {
  if (!driver) return 'Driver not found'
  if (!driver.licenseExpiry) return 'Driver license expiry date is not set'
  if (!isDriverLicenseValid(driver.licenseExpiry, onDate)) {
    return `Driver license expired on ${formatLicenseExpiryDate(driver.licenseExpiry)}`
  }
  return null
}

export function isBusAssignableForRoute(bus, routeServiceType) {
  if (!bus || bus.status !== 'available') return false
  if (routeServiceType && bus.serviceType && bus.serviceType !== routeServiceType) return false
  const minCapacity = defaultMinCapacityForService(routeServiceType)
  if (Number(bus.capacity) < minCapacity) return false
  return true
}
