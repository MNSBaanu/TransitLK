import Route from '../models/Route.js'
import Schedule from '../models/Schedule.js'
import {
  getResourceBusyEndMinutes,
  startOfDay,
  endOfDay,
  timeToMinutes,
} from './scheduleHelpers.js'

const INACTIVE_SCHEDULE_STATUSES = ['cancelled', 'draft']

export function serializeRouteRef(route) {
  if (!route) return null
  const id = route._id ?? route
  if (!id) return null
  return {
    _id: id,
    routeNo: route.routeNo ?? null,
    routeName: route.routeName ?? null,
    serviceType: route.serviceType ?? null,
    status: route.status ?? null,
  }
}

function serializeCurrentSchedule(schedule, phase) {
  if (!schedule) return null
  const route = schedule.routeId
  return {
    _id: schedule._id,
    routeId: route?._id ?? schedule.routeId ?? null,
    routeName: route?.routeName ?? null,
    routeNo: route?.routeNo ?? null,
    departureTime: schedule.departureTime,
    arrivalTime: schedule.arrivalTime,
    status: schedule.status,
    phase,
    tripDate: schedule.tripDate,
  }
}

export function pickCurrentSchedule(schedules, now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const active = schedules.filter((s) => !INACTIVE_SCHEDULE_STATUSES.includes(s.status))
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

/** Load route + schedule assignments from MongoDB for fleet list rows */
async function loadFleetContextFromDb(resourceIds, resourceField, today = new Date()) {
  if (!resourceIds.length) {
    return { routeByResourceId: new Map(), schedulesByResourceId: new Map() }
  }

  const dayStart = startOfDay(today)
  const dayEnd = endOfDay(today)

  const [routes, schedules] = await Promise.all([
    Route.find({ [resourceField]: { $in: resourceIds } })
      .select(`${resourceField} routeNo routeName serviceType status updatedAt createdAt`)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    Schedule.find({
      [resourceField]: { $in: resourceIds },
      tripDate: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: INACTIVE_SCHEDULE_STATUSES },
    })
      .populate('routeId', 'routeNo routeName serviceType status')
      .select(`${resourceField} routeId departureTime arrivalTime status tripDate`)
      .sort({ departureTime: 1 })
      .lean(),
  ])

  return {
    routeByResourceId: indexRoutesByField(routes, resourceField),
    schedulesByResourceId: indexSchedulesByField(schedules, resourceField),
  }
}

function resolveCurrentRoute(assignedRoute, currentSchedulePick) {
  const scheduleRoute =
    currentSchedulePick?.schedule?.routeId &&
    typeof currentSchedulePick.schedule.routeId === 'object'
      ? serializeRouteRef(currentSchedulePick.schedule.routeId)
      : null
  if (scheduleRoute?.routeName) return scheduleRoute
  return serializeRouteRef(assignedRoute)
}

/** Attach currentRoute + currentSchedule from DB collections onto fleet rows */
export async function attachFleetAssignmentContext(items, { resourceField }) {
  if (!items.length) return []

  const resourceIds = items.map((item) => item._id)
  const today = new Date()
  const { routeByResourceId, schedulesByResourceId } = await loadFleetContextFromDb(
    resourceIds,
    resourceField,
    today
  )

  return items.map((item) => {
    const doc = typeof item.toObject === 'function' ? item.toObject() : { ...item }
    const key = String(item._id)

    const assignedRoute = routeByResourceId.get(key)
    const todayTrips = schedulesByResourceId.get(key) || []
    const currentPick = pickCurrentSchedule(todayTrips, today)

    doc.currentRoute = resolveCurrentRoute(assignedRoute, currentPick)
    doc.currentSchedule = currentPick
      ? serializeCurrentSchedule(currentPick.schedule, currentPick.phase)
      : null

    if (resourceField === 'busId' && assignedRoute?.serviceType) {
      doc.serviceType = assignedRoute.serviceType
    }

    return doc
  })
}
