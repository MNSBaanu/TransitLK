import { useMemo } from 'react'
import {
  formatRouteEndpointsLabel,
  formatScheduleStatusLabel,
  formatTimeRange,
  formatTripDate,
  getWeekDayDates,
  parseLocalDateInput,
  scheduleCode,
  scheduleStatusClass,
  tripDateKey,
} from '../../utils/scheduleHelpers'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ScheduleWeekTimetable({ schedules, routes, anchorDate, selectedId, onSelectTrip }) {
  const weekDays = getWeekDayDates(anchorDate)

  const routeRows = useMemo(() => {
    const byId = new Map()
    const addRoute = (route) => {
      const id = route?._id || route
      if (!id) return
      const key = String(id)
      if (byId.has(key)) return
      byId.set(key, {
        _id: key,
        routeName: route?.routeName || 'Route',
        startPoint: route?.startPoint,
        endPoint: route?.endPoint,
        stops: route?.stops,
        viaDescription: route?.viaDescription,
      })
    }
    schedules.forEach((trip) => addRoute(trip.routeId))
    routes.forEach((route) => addRoute(route))
    return [...byId.values()].sort((a, b) =>
      formatRouteEndpointsLabel(a).localeCompare(formatRouteEndpointsLabel(b))
    )
  }, [routes, schedules])

  const tripsFor = (routeId, dayKey) =>
    schedules.filter((s) => {
      if (tripDateKey(s) !== dayKey) return false
      return String(s.routeId?._id || s.routeId) === String(routeId)
    })

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-depot-navy text-xs font-semibold uppercase tracking-wide text-white">
          <tr>
            <th className="sticky left-0 z-10 bg-depot-navy px-4 py-3 text-left">Route</th>
            {weekDays.map((day, i) => (
              <th key={day} className="min-w-[110px] px-2 py-3 text-left">
                <span className="block">{DAY_LABELS[i]}</span>
                <span className="font-normal normal-case text-white/70">
                  {parseLocalDateInput(day).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant bg-white">
          {routeRows.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-10 text-center text-on-surface-variant">
                No routes or schedules this week. Add a schedule to build the timetable.
              </td>
            </tr>
          ) : (
            routeRows.map((route) => (
              <tr key={route._id} className="hover:bg-surface-container/40">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-neutral-900">
                  <p>{formatRouteEndpointsLabel(route)}</p>
                </td>
                {weekDays.map((day) => {
                  const trips = tripsFor(route._id, day)
                  return (
                    <td key={day} className="align-top px-2 py-2">
                      {trips.length === 0 ? (
                        <span className="text-xs text-on-surface-variant">—</span>
                      ) : (
                        <ul className="space-y-1.5">
                          {trips.map((trip) => {
                            const selected = selectedId === trip._id
                            return (
                              <li key={trip._id}>
                                <button
                                  type="button"
                                  onClick={() => onSelectTrip(trip)}
                                  className={`w-full rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${
                                    selected
                                      ? 'border-depot-blue-light bg-depot-blue-light text-white'
                                      : 'border-outline-variant bg-surface-container/50 hover:border-depot-navy'
                                  }`}
                                >
                                  <span className="block font-bold tabular-nums">
                                    {formatTimeRange(trip.departureTime, trip.arrivalTime)}
                                  </span>
                                  <span className={`block truncate ${selected ? 'opacity-90' : 'text-on-surface-variant'}`}>
                                    {trip.busId?.regNumber} · {scheduleCode(trip)}
                                  </span>
                                  <span
                                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      selected
                                        ? 'bg-white/20 text-white'
                                        : scheduleStatusClass(trip.status)
                                    }`}
                                  >
                                    {formatScheduleStatusLabel(trip.status)}
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="border-t border-outline-variant bg-surface-container/30 px-4 py-2 text-xs text-on-surface-variant">
        Week of {formatTripDate(weekDays[0])} — each cell shows departure and arrival times per route.
      </p>
    </div>
  )
}

export default ScheduleWeekTimetable
