import Route from '../models/Route.js'
import Schedule from '../models/Schedule.js'
import { scheduleFilterBlockingRouteAssignment } from './scheduleHelpers.js'

const ROUTE_STATUSES_PRESERVED_ON_SYNC = new Set(['draft', 'inactive'])

function hasFleetAssigned(route) {
  const busId = route?.busId?._id ?? route?.busId
  const driverId = route?.driverId?._id ?? route?.driverId
  return Boolean(busId && driverId)
}

export function resolveRouteOperationalStatus(route, activeTripCount = 0) {
  const plain = route?.toObject ? route.toObject() : { ...route }
  if (plain.status === 'draft' || plain.status === 'inactive') return plain

  const trips = Number(activeTripCount) || 0
  if (trips > 0 || hasFleetAssigned(plain)) {
    plain.status = 'assigned'
  } else if (plain.status === 'assigned') {
    plain.status = 'active'
  }

  return plain
}

export async function getRouteIdsWithActiveTrips() {
  return Schedule.distinct('routeId', scheduleFilterBlockingRouteAssignment())
}

/** Keep route.status aligned with current/future trips and default fleet assignment */
export async function syncRouteStatusForRouteId(routeId) {
  if (!routeId) return

  const route = await Route.findById(routeId).select('status busId driverId')
  if (!route || ROUTE_STATUSES_PRESERVED_ON_SYNC.has(route.status)) return

  const activeTripCount = await Schedule.countDocuments(
    scheduleFilterBlockingRouteAssignment({ routeId })
  )

  const resolved = resolveRouteOperationalStatus(route, activeTripCount)
  if (route.status !== resolved.status) {
    await Route.findByIdAndUpdate(routeId, { status: resolved.status })
  }
}

/** Reconcile assigned routes that no longer have today/future trips. */
export async function syncAllAssignedRouteStatuses() {
  const assignedRoutes = await Route.find({ status: 'assigned' }).select('_id').lean()
  await Promise.all(assignedRoutes.map((route) => syncRouteStatusForRouteId(route._id)))
}
