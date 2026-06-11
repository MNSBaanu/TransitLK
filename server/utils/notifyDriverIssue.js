import Notification from '../models/Notification.js'
import User from '../models/User.js'
import Admin from '../models/Admin.js'
import Route from '../models/Route.js'
import Driver from '../models/Driver.js'
import { ROLES } from './roles.js'

function routeLabel(route) {
  if (!route) return 'Route'
  if (route.routeName) return route.routeName
  if (route.startPoint && route.endPoint) return `${route.startPoint} → ${route.endPoint}`
  return 'Route'
}

/** Notify transport schedulers and administrators when a driver reports a trip issue. */
export async function notifyDriverIssueReport({ schedule, notes }) {
  const route = await Route.findById(schedule.routeId).select(
    'routeName startPoint endPoint depotId'
  )
  if (!route?.depotId) return

  const driver = await Driver.findById(schedule.driverId).select('name')
  const label = routeLabel(route)
  const driverName = driver?.name || 'Driver'
  const excerpt = notes.length > 120 ? `${notes.slice(0, 117)}…` : notes

  const [schedulers, admins] = await Promise.all([
    User.find({
      role: ROLES.TRANSPORT_SCHEDULER,
      isActive: true,
      depotId: route.depotId,
    }).select('_id'),
    Admin.find({
      role: { $in: [ROLES.ADMINISTRATOR, ROLES.SUPERADMINISTRATOR] },
      $or: [{ depotId: route.depotId }, { depotId: null }, { depotId: { $exists: false } }],
    }).select('_id'),
  ])

  const recipientIds = [
    ...new Set([
      ...schedulers.map((u) => String(u._id)),
      ...admins.map((a) => String(a._id)),
    ]),
  ]

  if (!recipientIds.length) return

  const notifications = recipientIds.map((userId) => ({
    userId,
    type: 'driver_issue',
    priority: 'high',
    title: 'Driver reported trip issue',
    message: `${driverName} · ${label}: ${excerpt}`,
    data: {
      scheduleId: schedule._id,
      routeId: route._id,
      driverId: schedule.driverId,
      notes,
    },
    link: '/schedules',
  }))

  await Notification.insertMany(notifications)
}
