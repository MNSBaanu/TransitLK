import Route from '../models/Route.js'
import Schedule from '../models/Schedule.js'
import {
  getResourceBusyEndMinutes,
  startOfDay,
  endOfDay,
  timeToMinutes,
} from './scheduleHelpers.js'

const INACTIVE_SCHEDULE_STATUSES = ['cancelled', 'draft']
const UPCOMING_LOOKUP_DAYS = 30

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

export function pickCurrentOrNextSchedule(todayTrips, nextTrip, now = new Date()) {
  const todayPick = pickCurrentSchedule(todayTrips, now)
  if (todayPick) return todayPick
  if (!nextTrip) return null

  const tripDay = startOfDay(nextTrip.tripDate)
  const todayStart = startOfDay(now)
  const phase = tripDay > todayStart ? 'next' : 'upcoming'
  return { schedule: nextTrip, phase }
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

function indexFirstScheduleByField(schedules, field) {
  const map = new Map()
  for (const schedule of schedules) {
    const key = schedule[field] ? String(schedule[field]) : ''
    if (key && !map.has(key)) map.set(key, schedule)
  }
  return map
}

function supplementRoutesFromSchedules(routeMap, schedules, resourceField) {
  for (const schedule of schedules) {
    const key = schedule[resourceField] ? String(schedule[resourceField]) : ''
    if (!key || routeMap.has(key)) continue
    const route = schedule.routeId
    if (route && typeof route === 'object' && route.routeName) {
      routeMap.set(key, route)
    }
  }
}

/** Load route + schedule assignments from MongoDB for fleet list rows */
async function loadFleetContextFromDb(resourceIds, resourceField, today = new Date()) {
  if (!resourceIds.length) {
    return {
      routeByResourceId: new Map(),
      schedulesByResourceId: new Map(),
      nextScheduleByResourceId: new Map(),
    }
  }

  const dayStart = startOfDay(today)
  const dayEnd = endOfDay(today)
  const upcomingEnd = new Date(dayEnd)
  upcomingEnd.setDate(upcomingEnd.getDate() + UPCOMING_LOOKUP_DAYS)

  const scheduleSelect = `${resourceField} routeId departureTime arrivalTime status tripDate`
  const schedulePopulate = { path: 'routeId', select: 'routeNo routeName serviceType status' }

  const [routes, todaySchedules, upcomingSchedules] = await Promise.all([
    Route.find({ [resourceField]: { $in: resourceIds } })
      .select(`${resourceField} routeNo routeName serviceType status updatedAt createdAt`)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    Schedule.find({
      [resourceField]: { $in: resourceIds },
      tripDate: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: INACTIVE_SCHEDULE_STATUSES },
    })
      .populate(schedulePopulate)
      .select(scheduleSelect)
      .sort({ departureTime: 1 })
      .lean(),
    Schedule.find({
      [resourceField]: { $in: resourceIds },
      tripDate: { $gt: dayEnd, $lte: upcomingEnd },
      status: { $nin: INACTIVE_SCHEDULE_STATUSES },
    })
      .populate(schedulePopulate)
      .select(scheduleSelect)
      .sort({ tripDate: 1, departureTime: 1 })
      .lean(),
  ])

  const routeByResourceId = indexRoutesByField(routes, resourceField)
  supplementRoutesFromSchedules(routeByResourceId, todaySchedules, resourceField)
  supplementRoutesFromSchedules(routeByResourceId, upcomingSchedules, resourceField)

  return {
    routeByResourceId,
    schedulesByResourceId: indexSchedulesByField(todaySchedules, resourceField),
    nextScheduleByResourceId: indexFirstScheduleByField(upcomingSchedules, resourceField),
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
  const { routeByResourceId, schedulesByResourceId, nextScheduleByResourceId } =
    await loadFleetContextFromDb(resourceIds, resourceField, today)

  return items.map((item) => {
    const doc = typeof item.toObject === 'function' ? item.toObject() : { ...item }
    const key = String(item._id)

    const assignedRoute = routeByResourceId.get(key)
    const todayTrips = schedulesByResourceId.get(key) || []
    const nextTrip = nextScheduleByResourceId.get(key) || null
    const currentPick = pickCurrentOrNextSchedule(todayTrips, nextTrip, today)

    doc.currentRoute = resolveCurrentRoute(assignedRoute, currentPick)
    doc.currentSchedule = currentPick
      ? serializeCurrentSchedule(currentPick.schedule, currentPick.phase)
      : null

    if (resourceField === 'busId') {
      const serviceType =
        assignedRoute?.serviceType ||
        currentPick?.schedule?.routeId?.serviceType ||
        doc.serviceType
      if (serviceType) doc.serviceType = serviceType
    }

    return doc
  })
}
