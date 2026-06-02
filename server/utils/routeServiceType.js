const EXPRESS_MIN_DISTANCE_KM = 100
const SEMI_LUXURY_MIN_DISTANCE_KM = 40

export function inferRouteServiceType(route = {}) {
  const distance = Number(route.distance)
  const routeText = [
    route.routeName,
    route.startPoint,
    route.endPoint,
    route.viaDescription,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (routeText.includes('town service')) return 'ordinary'
  if (Number.isFinite(distance) && distance >= EXPRESS_MIN_DISTANCE_KM) return 'express'
  if (Number.isFinite(distance) && distance >= SEMI_LUXURY_MIN_DISTANCE_KM) return 'semi-luxury'
  return 'ordinary'
}
