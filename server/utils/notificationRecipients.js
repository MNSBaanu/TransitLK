import { ROLES } from './roles.js'

export function resolveActorId(user) {
  return user?.id || user?._id
}

export function isDriverAccount(user) {
  return user?.accountType === 'driver' || user?.role === ROLES.DRIVER
}

export function notificationRecipientFilter(user) {
  const actorId = resolveActorId(user)
  if (isDriverAccount(user)) {
    return { driverId: actorId }
  }
  return { userId: actorId }
}

export function notificationOwnedBy(notification, user) {
  const actorId = String(resolveActorId(user))
  if (isDriverAccount(user)) {
    return String(notification.driverId) === actorId
  }
  return String(notification.userId) === actorId
}
