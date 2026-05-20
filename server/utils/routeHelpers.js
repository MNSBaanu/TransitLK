import { isWithinWorkingHours } from './fleetHelpers.js'

const ALLOWED_FIELDS = [
  'routeName',
  'distance',
  'startPoint',
  'endPoint',
  'stops',
  'startLocation',
  'endLocation',
  'stopLocations',
  'busId',
  'driverId',
  'serviceType',
]

export function sanitizeRouteBody(body) {
  const data = {}
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  if (Array.isArray(data.stops)) {
    data.stops = data.stops.map((s) => String(s).trim()).filter(Boolean)
  }
  if (data.distance !== undefined) data.distance = Number(data.distance)
  if (data.busId === '') data.busId = null
  if (data.driverId === '') data.driverId = null
  return data
}

export function validateLocation(loc, label) {
  if (!loc) return null
  const lat = Number(loc.lat)
  const lng = Number(loc.lng)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    const error = new Error(`${label} coordinates are invalid`)
    error.statusCode = 400
    throw error
  }
  return { lat, lng, address: loc.address?.trim() || undefined }
}

export function validateStopLocations(stops, stopLocations) {
  if (!stopLocations?.length) return []
  return stopLocations.map((sl, i) => {
    const lat = Number(sl.lat)
    const lng = Number(sl.lng)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      const error = new Error(`Stop location ${i + 1} has invalid coordinates`)
      error.statusCode = 400
      throw error
    }
    return {
      name: sl.name?.trim() || stops[i] || `Stop ${i + 1}`,
      lat,
      lng,
    }
  })
}

export { isWithinWorkingHours }
