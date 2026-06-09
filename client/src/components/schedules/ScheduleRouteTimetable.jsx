import { useMemo } from 'react'
import Icon from '../Icon'
import {
  buildRouteTimetableRows,
  formatRouteEndpointsLabel,
  formatScheduleStatusLabel,
  formatTimeRange,
  formatTripDate,
  parseLocalDateInput,
  scheduleCode,
  scheduleStatusClass,
  tripDateKey,
} from '../../utils/scheduleHelpers'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ScheduleRouteTimetable({
  schedules,
  routes,
  dayColumns,
  focusDate,
  period = 'weekly',
  selectedId,
  onSelectTrip,
  onPickDay,
  footerNote,
}) {
  const routeRows = useMemo(
    () => buildRouteTimetableRows(routes, schedules),
    [routes, schedules]
  )

  const tripsFor = (routeId, dayKey) =>
    schedules.filter((s) => {
      if (tripDateKey(s) !== dayKey) return false
      return String(s.routeId?._id || s.routeId) === String(routeId)
    })

  const colSpan = 2 + dayColumns.length
  const compact = period === 'monthly'

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-depot-navy text-xs font-semibold uppercase tracking-wide text-white">
          <tr>
            <th className="w-12 px-4 py-3 text-left">#</th>
            <th className="sticky left-0 z-10 w-56 min-w-56 max-w-56 bg-depot-navy px-4 py-3 text-left">
              Route
            </th>
            {dayColumns.map((day) => {
              const isFocus = day === focusDate
              const d = parseLocalDateInput(day)
              const weekday = WEEKDAY_LABELS[(d.getDay() + 6) % 7]
              return (
                <th
                  key={day}
                  className={`${compact ? 'min-w-[76px]' : 'min-w-[110px]'} px-2 py-3 text-left ${
                    isFocus ? 'bg-depot-blue-light/40' : ''
                  }`}
                >
                  {compact ? (
                    <button
                      type="button"
                      onClick={() => onPickDay?.(day)}
                      className={`block w-full text-left ${onPickDay ? 'hover:underline' : ''}`}
                      title={onPickDay ? `Open ${formatTripDate(day)}` : undefined}
                    >
                      <span className="block tabular-nums">{d.getDate()}</span>
                      <span className="font-normal normal-case text-white/70">{weekday}</span>
                    </button>
                  ) : (
                    <>
                      <span className="block">{weekday}</span>
                      <span className="font-normal normal-case text-white/70">
                        {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant bg-white">
          {routeRows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="py-10 text-center text-on-surface-variant">
                No active routes to display. Add or activate routes in Route Management.
              </td>
            </tr>
          ) : (
            routeRows.map((route, index) => {
              const routeLabel = formatRouteEndpointsLabel(route)
              const tripCount = dayColumns.reduce(
                (sum, day) => sum + tripsFor(route._id, day).length,
                0
              )
              return (
              <tr key={route._id} className="group hover:bg-surface-container/40">
                <td className="px-4 py-3 text-neutral-500 tabular-nums">{index + 1}</td>
                <td className="sticky left-0 z-10 w-56 min-w-56 max-w-56 bg-white px-4 py-3 group-hover:bg-surface-container">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon name="map" size={20} className="shrink-0 text-depot-navy" />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-bold text-neutral-900"
                        title={routeLabel}
                      >
                        {routeLabel}
                      </p>
                      <p className="truncate text-[10px] text-on-surface-variant">
                        {tripCount
                          ? `${tripCount} trip${tripCount !== 1 ? 's' : ''} in period`
                          : 'No trips in period'}
                      </p>
                    </div>
                  </div>
                </td>
                {dayColumns.map((day) => {
                  const trips = tripsFor(route._id, day)
                  const isFocus = day === focusDate
                  return (
                    <td
                      key={day}
                      className={`align-top px-2 py-2 ${
                        isFocus ? 'bg-depot-blue-light/5' : ''
                      }`}
                    >
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
                                  <span
                                    className={`block truncate ${
                                      selected ? 'opacity-90' : 'text-on-surface-variant'
                                    }`}
                                  >
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
            )})
          )}
        </tbody>
      </table>
      {footerNote ? (
        <p className="border-t border-outline-variant bg-surface-container/30 px-4 py-2 text-xs text-on-surface-variant">
          {footerNote}
        </p>
      ) : null}
    </div>
  )
}

export default ScheduleRouteTimetable
