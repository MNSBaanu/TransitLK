import { normalizeTime, normalizeWorkingHours, formatWorkingHoursDisplay } from './timeFormat.js'

export { formatWorkingHoursDisplay }

/** Populated depot object or legacy string id */
export function depotLabel(depot) {
  if (!depot) return '—'
  if (typeof depot === 'string') return depot
  return depot.depotName || depot.location || '—'
}

export function depotIdValue(depot) {
  if (!depot) return ''
  if (typeof depot === 'string') return depot
  return depot._id || ''
}

export function formatServiceType(type) {
  if (!type) return '—'
  return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Parse "06:00-18:00" or "06:00 - 18:00" into time inputs */
export function parseWorkingHours(workingHours) {
  if (!workingHours?.trim()) return { start: '', end: '' }
  const match = workingHours.match(/(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?/i)
  if (!match) return { start: '', end: '' }
  const pad = (h, m) => `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
  return {
    start: pad(match[1], match[2]),
    end: pad(match[3], match[4]),
  }
}

/** Format start/end time pickers for HH:mm - HH:mm storage */
export function formatWorkingHours(start, end) {
  if (!start?.trim() || !end?.trim()) return ''
  const normalizedStart = normalizeTime(start.trim())
  const normalizedEnd = normalizeTime(end.trim())
  if (!normalizedStart || !normalizedEnd) return ''
  return `${normalizedStart} - ${normalizedEnd}`
}

/** Parse "06:00-18:00" style working hours */
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

/** Check if departure time (HH:mm) falls within working hours string */
export function isWithinWorkingHoursAtTime(workingHours, departureTime) {
  if (!workingHours?.trim()) return true
  if (/off|leave|unavailable/i.test(workingHours)) return false

  const match = workingHours.match(/(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?/i)
  if (!match) return true

  const depMatch = String(departureTime || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!depMatch) return isWithinWorkingHours(workingHours)

  const startH = Number(match[1])
  const startM = Number(match[2] || 0)
  const endH = Number(match[3])
  const endM = Number(match[4] || 0)
  const minutes = Number(depMatch[1]) * 60 + Number(depMatch[2])
  const start = startH * 60 + startM
  let end = endH * 60 + endM
  if (end <= start) end += 24 * 60
  return minutes >= start && minutes < end
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
export function isDriverLicenseValid(driver, onDate = new Date()) {
  if (!driver?.licenseExpiry) return false
  const exp = startOfCalendarDay(driver.licenseExpiry)
  const ref = startOfCalendarDay(onDate)
  if (!exp || !ref) return false
  return exp >= ref
}

export function getDriverLicenseInvalidReason(driver, onDate = new Date()) {
  if (!driver) return 'Driver not found'
  if (!driver.licenseExpiry) return 'Driver license expiry date is not set'
  if (!isDriverLicenseValid(driver, onDate)) {
    return `Driver license expired on ${formatLicenseExpiryDate(driver.licenseExpiry)}`
  }
  return null
}

export function driverAvailabilityLabel(driver, atTime, onDate) {
  if (!driver) return 'Unknown'
  const licenseIssue = getDriverLicenseInvalidReason(driver, onDate)
  if (licenseIssue) return licenseIssue
  if (driver.status && driver.status !== 'available') {
    return formatServiceType(driver.status)
  }
  const withinHours = atTime
    ? isWithinWorkingHoursAtTime(driver.workingHours, atTime)
    : isWithinWorkingHours(driver.workingHours)
  if (!withinHours) {
    return atTime ? 'Outside working hours for trip time' : 'Outside working hours'
  }
  return 'Available'
}

export function isDriverStatusAvailable(driver) {
  if (!driver) return false
  return !driver.status || driver.status === 'available'
}

/** @param {string} [atTime] HH:mm — trip departure; omit to use current time (route assignment) */
/** @param {string|Date} [onDate] calendar day for license validity; defaults to today */
/** @param {string} [keepAssignedDriverId] allow on-duty driver already assigned to this trip */
export function isDriverAssignable(driver, atTime, onDate = new Date(), keepAssignedDriverId = null) {
  if (
    keepAssignedDriverId &&
    String(driver?._id) === String(keepAssignedDriverId)
  ) {
    if (!isDriverLicenseValid(driver, onDate)) return false
    if (atTime) return isWithinWorkingHoursAtTime(driver.workingHours, atTime)
    return isWithinWorkingHours(driver.workingHours)
  }
  if (!isDriverStatusAvailable(driver)) return false
  if (!isDriverLicenseValid(driver, onDate)) return false
  if (atTime) return isWithinWorkingHoursAtTime(driver.workingHours, atTime)
  return isWithinWorkingHours(driver.workingHours)
}

export function driverUnassignableReason(driver, atTime, onDate = new Date(), keepAssignedDriverId = null) {
  if (!driver) return 'Not found'
  if (
    keepAssignedDriverId &&
    String(driver._id) === String(keepAssignedDriverId)
  ) {
    const licenseIssue = getDriverLicenseInvalidReason(driver, onDate)
    if (licenseIssue) return licenseIssue
    const withinHours = atTime
      ? isWithinWorkingHoursAtTime(driver.workingHours, atTime)
      : isWithinWorkingHours(driver.workingHours)
    if (!withinHours) {
      return atTime ? 'Outside working hours for trip time' : 'Outside working hours'
    }
    return null
  }
  if (!isDriverStatusAvailable(driver)) {
    return `Not available (${formatServiceType(driver.status || 'unavailable')})`
  }
  const licenseIssue = getDriverLicenseInvalidReason(driver, onDate)
  if (licenseIssue) return licenseIssue
  const withinHours = atTime
    ? isWithinWorkingHoursAtTime(driver.workingHours, atTime)
    : isWithinWorkingHours(driver.workingHours)
  if (!withinHours) {
    return atTime ? 'Outside working hours for trip time' : 'Outside working hours'
  }
  return null
}

/** Default minimum seat requirement by route service type */
export const SERVICE_MIN_CAPACITY = {
  ordinary: 40,
  express: 35,
  'semi-luxury': 28,
}

export function defaultMinCapacityForService(serviceType) {
  return SERVICE_MIN_CAPACITY[serviceType] ?? 30
}

export function isBusAssignable(bus, routeServiceType, minCapacity = 0) {
  if (!bus || bus.status === 'maintenance' || bus.status !== 'available') return false
  if (routeServiceType && bus.serviceType && bus.serviceType !== routeServiceType) return false
  const required = Number(minCapacity) || defaultMinCapacityForService(routeServiceType)
  if (required > 0 && Number(bus.capacity) < required) return false
  return true
}

export function getFleetDeleteDisabledReason(item, resourceLabel) {
  const count = Number(item?.scheduleCount) || 0

  if (resourceLabel === 'bus') {
    if (item?.status === 'in-service') {
      return 'Cannot delete — this bus is in service. Complete or remove assigned trips first.'
    }
    if (count > 0) {
      return `Cannot delete — ${count} active trip${count !== 1 ? 's' : ''} assigned to this bus. Complete or remove those trips first.`
    }
    return null
  }

  if (count > 0) {
    return `Cannot delete — ${count} active trip${count !== 1 ? 's' : ''} assigned to this ${resourceLabel}. Complete or remove those trips first.`
  }
  return null
}

export function busUnassignableReason(bus, routeServiceType, minCapacity = 0) {
  if (!bus) return 'Not found'
  if (bus.status === 'maintenance') return 'Vehicle is under maintenance'
  if (bus.status !== 'available') {
    return `Not available (${formatServiceType(bus.status)})`
  }
  if (routeServiceType && bus.serviceType && bus.serviceType !== routeServiceType) {
    return `Requires ${formatServiceType(routeServiceType)} service type (bus is ${formatServiceType(bus.serviceType)})`
  }
  const required = Number(minCapacity) || defaultMinCapacityForService(routeServiceType)
  if (required > 0 && Number(bus.capacity) < required) {
    return `Capacity ${bus.capacity} seats — requires ≥${required}`
  }
  return null
}
