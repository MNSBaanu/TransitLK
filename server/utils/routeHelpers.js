import { isWithinWorkingHours } from './fleetHelpers.js'

const ALLOWED_FIELDS = [
  'routeNo',
  'routeName',
  'distance',
  'startPoint',
  'endPoint',
  'viaDescription',
  'stops',
  'startLocation',
  'endLocation',
  'stopLocations',
  'busId',
  'driverId',
  'serviceType',
  'status',
]

export function sanitizeRouteBody(body) {
  const data = {}
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  if (data.routeNo !== undefined) data.routeNo = String(data.routeNo).trim()
  if (data.routeName !== undefined) data.routeName = String(data.routeName).trim()
  if (data.startPoint !== undefined) data.startPoint = compactRouteSegment(data.startPoint)
  if (data.endPoint !== undefined) data.endPoint = compactRouteSegment(data.endPoint)
  if (data.viaDescription !== undefined) {
    data.viaDescription = String(data.viaDescription).trim() || undefined
  }
  if (Array.isArray(data.stops)) {
    data.stops = data.stops.map((s) => compactRouteSegment(s)).filter(Boolean)
  }
  if (data.distance !== undefined) data.distance = Number(data.distance)
  if (data.busId === '') data.busId = null
  if (data.driverId === '') data.driverId = null
  return data
}

/** Short single-line place label for route names (e.g. "Matale" not "Matale, Sri Lanka"). */
export function compactRouteSegment(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^via\s+/i, '')
    .split(',')[0]
    .trim()
}

export function stopsForRouteName(data = {}) {
  if (Array.isArray(data.stops) && data.stops.length) {
    return data.stops
  }
  if (data.viaDescription) {
    const via = compactRouteSegment(data.viaDescription)
    return via ? [via] : []
  }
  return []
}

export function buildRouteName(startPoint, endPoint, stops = []) {
  const start = compactRouteSegment(startPoint)
  const end = compactRouteSegment(endPoint)
  const viaStops = (Array.isArray(stops) ? stops : [])
    .map(compactRouteSegment)
    .filter(Boolean)
  const segments = [start, ...viaStops, end].filter(Boolean)
  return segments.join('-')
}

/** Start/end label used in fleet and schedule views */
export function formatRouteEndpointsLabel(route = {}) {
  const start = String(route.startPoint || '').trim()
  const end = String(route.endPoint || '').trim()
  if (start && end) return `${start} → ${end}`
  return buildRouteName(start, end) || route.routeName || ''
}

/** Legacy SLTB-style label derived from the first stop when stops are used instead of manual via. */
export function deriveViaDescription(stops) {
  if (!stops?.length) return undefined
  const first = stops[0]
  return /^via\s/i.test(first) ? first : `via ${first}`
}

export function resolveRouteDisplayName(route = {}) {
  if (route.startPoint && route.endPoint) {
    return buildRouteName(route.startPoint, route.endPoint, stopsForRouteName(route))
  }
  return route.routeName || ''
}

export function applyComputedRouteName(route) {
  const plain = route?.toObject ? route.toObject() : { ...route }
  const computed = resolveRouteDisplayName(plain)
  if (computed) plain.routeName = computed
  return plain
}

export function finalizeRouteFields(data) {
  if (data.startPoint && data.endPoint) {
    data.routeName = buildRouteName(data.startPoint, data.endPoint, stopsForRouteName(data))
  }
  if (Array.isArray(data.stops) && data.stops.length > 0) {
    data.viaDescription = deriveViaDescription(data.stops)
  }
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
