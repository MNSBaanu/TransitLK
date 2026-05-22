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

export function driverAvailabilityLabel(driver) {
  if (!driver) return 'Unknown'
  if (driver.status && driver.status !== 'available') {
    return formatServiceType(driver.status)
  }
  if (!isWithinWorkingHours(driver.workingHours)) {
    return 'Outside working hours'
  }
  return 'Available'
}

export function isDriverAssignable(driver) {
  if (!driver) return false
  if (driver.status && driver.status !== 'available') return false
  return isWithinWorkingHours(driver.workingHours)
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
  if (!bus || bus.status !== 'available') return false
  if (routeServiceType && bus.serviceType && bus.serviceType !== routeServiceType) {
    return false
  }
  const required = Number(minCapacity) || 0
  if (required > 0 && Number(bus.capacity) < required) return false
  return true
}

export function busUnassignableReason(bus, routeServiceType, minCapacity = 0) {
  if (!bus) return 'Not found'
  if (bus.status !== 'available') {
    return `Not available (${formatServiceType(bus.status)})`
  }
  if (routeServiceType && bus.serviceType && bus.serviceType !== routeServiceType) {
    return `Needs ${formatServiceType(routeServiceType)} service (has ${formatServiceType(bus.serviceType)})`
  }
  const required = Number(minCapacity) || 0
  if (required > 0 && Number(bus.capacity) < required) {
    return `Capacity ${bus.capacity} seats — requires ≥${required}`
  }
  return null
}
