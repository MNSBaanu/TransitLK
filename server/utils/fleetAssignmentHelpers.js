import Route from '../models/Route.js'
import Schedule from '../models/Schedule.js'
import {
  getResourceBusyEndMinutes,
  startOfDay,
  endOfDay,
  timeToMinutes,
} from './scheduleHelpers.js'

const INACTIVE_SCHEDULE_STATUSES = new Set(['cancelled', 'draft'])

function serializeAssignedRoute(route) {
  if (!route) return null
  return {
    _id: route._id,
    routeNo: route.routeNo,
    routeName: route.routeName,
    serviceType: route.serviceType,
    status: route.status,
  }
}

function serializeCurrentSchedule(schedule, phase) {
  if (!schedule) return null
  return {
    _id: schedule._id,
    routeName: schedule.routeId?.routeName || null,
    departureTime: schedule.departureTime,
    arrivalTime: schedule.arrivalTime,
    status: schedule.status,
    phase,
    tripDate: schedule.tripDate,
  }
}

export function pickCurrentSchedule(schedules, now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const active = schedules.filter((s) => !INACTIVE_SCHEDULE_STATUSES.has(s.status))
  if (!active.length) return null

  const sorted = [...active].sort(
    (a, b) => (timeToMinutes(a.departureTime) ?? 0) - (timeToMinutes(b.departureTime) ?? 0)
  )

  const inProgress = sorted.find((s) => {
    const dep = timeToMinutes(s.departureTime)
    const busyEnd = getResourceBusyEndMinutes(s.departureTime, s.arrivalTime)
    return dep != null && busyEnd != null && nowMinutes >= dep && nowMinutes < busyEnd
  })
  if (inProgress) return { schedule: inProgress, phase: 'in-progress' }

  const upcoming = sorted.find((s) => {
    const dep = timeToMinutes(s.departureTime)
    return dep != null && dep > nowMinutes
  })
  if (upcoming) return { schedule: upcoming, phase: 'upcoming' }

  return { schedule: sorted[sorted.length - 1], phase: 'completed' }
}

function indexRoutesByField(routes, field) {
  const map = new Map()
  for (const route of routes) {
    const key = route[field] ? String(route[field]) : ''
    if (key && !map.has(key)) map.set(key, route)
  }
  return map
}

function indexSchedulesByField(schedules, field) {
  const grouped = new Map()
  for (const schedule of schedules) {
    const key = schedule[field] ? String(schedule[field]) : ''
    if (!key) continue
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(schedule)
  }
  return grouped
}

/** Attach assignedRoute + currentSchedule for fleet list endpoints */
export async function attachFleetAssignmentContext(items, { idField, routeField }) {
  if (!items.length) return items

  const ids = items.map((item) => item._id)
  const today = new Date()

  const [routes, schedules] = await Promise.all([
    Route.find({ [routeField]: { $in: ids } })
      .select('busId driverId routeNo routeName serviceType status updatedAt createdAt')
      .sort({ updatedAt: -1, createdAt: -1 }),
    Schedule.find({
      [idField]: { $in: ids },
      tripDate: { $gte: startOfDay(today), $lte: endOfDay(today) },
    })
      .populate('routeId', 'routeName routeNo')
      .select('routeId busId driverId departureTime arrivalTime status tripDate')
      .sort({ departureTime: 1 }),
  ])

  const routeByResourceId = indexRoutesByField(routes, routeField)
  const schedulesByResourceId = indexSchedulesByField(schedules, idField)

  return items.map((item) => {
    const doc = typeof item.toObject === 'function' ? item.toObject() : { ...item }
    const key = String(item._id)

    const assignedRoute = routeByResourceId.get(key)
    if (assignedRoute) {
      doc.assignedRoute = serializeAssignedRoute(assignedRoute)
      if (routeField === 'busId' && assignedRoute.serviceType) {
        doc.serviceType = assignedRoute.serviceType
      }
    }

    const todayTrips = schedulesByResourceId.get(key) || []
    const current = pickCurrentSchedule(todayTrips, today)
    doc.currentSchedule = current
      ? serializeCurrentSchedule(current.schedule, current.phase)
      : null

    return doc
  })
}
