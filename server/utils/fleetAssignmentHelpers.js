import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import Schedule from '../models/Schedule.js'
import {
  getResourceBusyEndMinutes,
  startOfDay,
  endOfDay,
  timeToMinutes,
} from './scheduleHelpers.js'

const INACTIVE_SCHEDULE_STATUSES = ['cancelled', 'draft']
const SCHEDULE_STATUSES_TO_CANCEL_ON_MAINTENANCE = [
  'draft',
  'pending',
  'approved',
  'scheduled',
  'on-duty',
  'on-time',
  'delayed',
]

/** Cancel all non-completed schedules when a bus is placed in maintenance */
export async function cancelActiveSchedulesForBus(
  busId,
  notes = 'Bus placed in maintenance — schedule cancelled'
) {
  if (!busId) return { cancelledCount: 0 }

  const result = await Schedule.updateMany(
    {
      busId,
      status: { $in: SCHEDULE_STATUSES_TO_CANCEL_ON_MAINTENANCE },
    },
    {
      $set: {
        status: 'cancelled',
        adjustmentReason: 'maintenance',
        adjustmentNotes: notes,
      },
    }
  )

  return { cancelledCount: result.modifiedCount }
}

function hasActiveTripToday(trips) {
  return trips.some((trip) => !INACTIVE_SCHEDULE_STATUSES.includes(trip.status))
}

function deriveBusStatusFromTrips(busStatus, todayTrips) {
  if (busStatus === 'maintenance') return 'maintenance'
  return hasActiveTripToday(todayTrips) ? 'in-service' : 'available'
}

/** Keep bus.status aligned with whether it has an active trip today */
export async function syncBusStatusForBusId(busId, today = new Date()) {
  if (!busId) return

  const bus = await Bus.findById(busId).select('status')
  if (!bus || bus.status === 'maintenance') return

  const dayStart = startOfDay(today)
  const dayEnd = endOfDay(today)
  const activeTripCount = await Schedule.countDocuments({
    busId,
    tripDate: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: INACTIVE_SCHEDULE_STATUSES },
  })

  const nextStatus = activeTripCount > 0 ? 'in-service' : 'available'
  if (bus.status !== nextStatus) {
    await Bus.findByIdAndUpdate(busId, { status: nextStatus })
  }
}

const DRIVER_ON_DUTY_TRIP_STATUSES = ['on-duty', 'on-time', 'delayed']

/** Keep driver.status aligned with active trips today */
export async function syncDriverStatusForDriverId(driverId, today = new Date()) {
  if (!driverId) return

  const driver = await Driver.findById(driverId).select('status')
  if (!driver || driver.status === 'on-leave' || driver.status === 'off-duty') return

  const dayStart = startOfDay(today)
  const dayEnd = endOfDay(today)
  const activeTripCount = await Schedule.countDocuments({
    driverId,
    tripDate: { $gte: dayStart, $lte: dayEnd },
    status: { $in: DRIVER_ON_DUTY_TRIP_STATUSES },
  })

  const nextStatus = activeTripCount > 0 ? 'on-duty' : 'available'
  if (driver.status !== nextStatus) {
    await Driver.findByIdAndUpdate(driverId, { status: nextStatus })
  }
}

async function syncBusStatusesFromTodaySchedules(busIds, schedulesByBusId) {
  if (!busIds.length) return

  const buses = await Bus.find({ _id: { $in: busIds } }).select('_id status').lean()
  const bulkOps = []

  for (const bus of buses) {
    if (bus.status === 'maintenance') continue
    const todayTrips = schedulesByBusId.get(String(bus._id)) || []
    const nextStatus = deriveBusStatusFromTrips(bus.status, todayTrips)
    if (bus.status !== nextStatus) {
      bulkOps.push({
        updateOne: {
          filter: { _id: bus._id },
          update: { $set: { status: nextStatus } },
        },
      })
    }
  }

  if (bulkOps.length) await Bus.bulkWrite(bulkOps)
}

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

/** Load today's schedule assignments from MongoDB for fleet list rows */
async function loadFleetContextFromDb(resourceIds, resourceField, today = new Date()) {
  if (!resourceIds.length) {
    return { schedulesByResourceId: new Map() }
  }

  const dayStart = startOfDay(today)
  const dayEnd = endOfDay(today)

  const todaySchedules = await Schedule.find({
    [resourceField]: { $in: resourceIds },
    tripDate: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: INACTIVE_SCHEDULE_STATUSES },
  })
    .populate('routeId', 'routeNo routeName serviceType status')
    .select(`${resourceField} routeId departureTime arrivalTime status tripDate`)
    .sort({ departureTime: 1 })
    .lean()

  return {
    schedulesByResourceId: indexSchedulesByField(todaySchedules, resourceField),
  }
}

function resolveCurrentRouteFromTodaySchedule(currentSchedulePick) {
  const scheduleRoute =
    currentSchedulePick?.schedule?.routeId &&
    typeof currentSchedulePick.schedule.routeId === 'object'
      ? serializeRouteRef(currentSchedulePick.schedule.routeId)
      : null
  return scheduleRoute?.routeName ? scheduleRoute : null
}

/** Attach today's currentRoute + currentSchedule from DB onto fleet rows */
export async function attachFleetAssignmentContext(items, { resourceField }) {
  if (!items.length) return []

  const resourceIds = items.map((item) => item._id)
  const today = new Date()
  const { schedulesByResourceId } = await loadFleetContextFromDb(
    resourceIds,
    resourceField,
    today
  )

  if (resourceField === 'busId') {
    await syncBusStatusesFromTodaySchedules(resourceIds, schedulesByResourceId)
  }

  return items.map((item) => {
    const doc = typeof item.toObject === 'function' ? item.toObject() : { ...item }
    const key = String(item._id)

    const todayTrips = schedulesByResourceId.get(key) || []
    const currentPick = pickCurrentSchedule(todayTrips, today)

    doc.currentRoute = resolveCurrentRouteFromTodaySchedule(currentPick)
    doc.currentSchedule = currentPick
      ? serializeCurrentSchedule(currentPick.schedule, currentPick.phase)
      : null

    if (resourceField === 'busId') {
      doc.status = deriveBusStatusFromTrips(doc.status, todayTrips)
    }

    return doc
  })
}
