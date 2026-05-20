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

export function isBusAssignable(bus) {
  return bus?.status === 'available'
}
