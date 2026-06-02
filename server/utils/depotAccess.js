import { ROLES } from './roles.js'

export function getUserDepotId(user) {
  return user?.depotId?._id || user?.depotId || null
}

export function isSuperadministrator(user) {
  return user?.role === ROLES.SUPERADMINISTRATOR
}

export function isDriver(user) {
  return user?.role === ROLES.DRIVER
}

export function requireUserDepot(user) {
  const depotId = getUserDepotId(user)
  if (!isSuperadministrator(user) && !isDriver(user) && !depotId) {
    const error = new Error('This account is not assigned to a depot')
    error.statusCode = 403
    throw error
  }
  return depotId
}

export function assertDepotAccess(user, depotId, message = 'Not allowed to access this depot data') {
  if (isSuperadministrator(user) || isDriver(user)) return
  const userDepotId = requireUserDepot(user)
  if (!depotId || String(userDepotId) !== String(depotId)) {
    const error = new Error(message)
    error.statusCode = 403
    throw error
  }
}

export function resolveWriteDepotId(user, requestedDepotId) {
  if (isSuperadministrator(user)) return requestedDepotId || undefined
  return requireUserDepot(user)
}
