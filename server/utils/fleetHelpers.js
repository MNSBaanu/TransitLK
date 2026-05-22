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

/** Check if departure time (HH:mm) falls within working hours string */
export function isWithinWorkingHoursAtTime(workingHours, departureTime) {
  if (!workingHours?.trim()) return true
  if (/off|leave|unavailable/i.test(workingHours)) return false

  const match = workingHours.match(/(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?/i)
  if (!match) return true

  const depMatch = String(departureTime || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!depMatch) return true

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

export const SERVICE_MIN_CAPACITY = {
  ordinary: 40,
  express: 35,
  'semi-luxury': 28,
}

export function defaultMinCapacityForService(serviceType) {
  return SERVICE_MIN_CAPACITY[serviceType] ?? 30
}

export function isBusAssignableForRoute(bus, routeServiceType) {
  if (!bus || bus.status !== 'available') return false
  if (routeServiceType && bus.serviceType && bus.serviceType !== routeServiceType) {
    return false
  }
  const minCapacity = defaultMinCapacityForService(routeServiceType)
  if (Number(bus.capacity) < minCapacity) return false
  return true
}
