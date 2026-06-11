import Notification from '../models/Notification.js'
import Route from '../models/Route.js'
import Bus from '../models/Bus.js'

function routeLabel(route) {
  if (!route) return 'Route'
  if (route.routeName) return route.routeName
  if (route.startPoint && route.endPoint) return `${route.startPoint} → ${route.endPoint}`
  return 'Route'
}

function formatTripDate(tripDate) {
  if (!tripDate) return 'Date TBC'
  return new Date(tripDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Notify the assigned driver when a pending trip is approved. */
export async function notifyDriverTripApproved({ schedule }) {
  if (!schedule?.driverId) return

  const [route, bus] = await Promise.all([
    Route.findById(schedule.routeId).select('routeName startPoint endPoint'),
    Bus.findById(schedule.busId).select('regNumber'),
  ])

  const label = routeLabel(route)
  const dateLabel = formatTripDate(schedule.tripDate)
  const timeLabel = `${schedule.departureTime}–${schedule.arrivalTime}`
  const busLabel = bus?.regNumber ? ` · ${bus.regNumber}` : ''

  await Notification.create({
    driverId: schedule.driverId,
    type: 'trip_approved',
    priority: 'high',
    title: 'Trip approved',
    message: `${label} · ${dateLabel} · ${timeLabel}${busLabel}`,
    data: {
      scheduleId: schedule._id,
      routeId: schedule.routeId,
      busId: schedule.busId,
    },
    link: '/my-trips',
  })
}
