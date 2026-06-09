import { useMemo } from 'react'
import Icon from '../Icon'
import {
  ROUTE_COLUMN_CLASS,
  ROUTE_HEADER_CLASS,
  TIMETABLE_COLUMN_HEADER_CLASS,
  TIMETABLE_DATA_ROW_CLASS,
  TIMETABLE_HEADER_ROW_CLASS,
  TIMETABLE_HEADER_CELL_STRIPE_CLASS,
  TIMETABLE_SCROLL_CLASS,
  TIMETABLE_SHELL_CLASS,
  timetableTripButtonClass,
  periodDayColumnWidth,
} from './scheduleTimetableShared'
import {
  buildRouteTimetableRows,
  formatRouteEndpointsLabel,
  formatScheduleStatusLabel,
  formatTimeRange,
  formatTripDate,
  parseLocalDateInput,
  scheduleCode,
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

  const compact = period === 'monthly'
  const { width: dayColumnPx, style: dayColumnStyle } = periodDayColumnWidth(period)

  return (
    <div className={TIMETABLE_SHELL_CLASS}>
      <div className={TIMETABLE_SCROLL_CLASS}>
        <div className="w-max min-w-full">
          <div className={TIMETABLE_HEADER_ROW_CLASS}>
            <div className={ROUTE_HEADER_CLASS}>Route</div>
            {dayColumns.map((day, i) => {
              const isFocus = day === focusDate
              const d = parseLocalDateInput(day)
              const weekday = WEEKDAY_LABELS[(d.getDay() + 6) % 7]
              return (
                <div
                  key={day}
                  style={dayColumnStyle}
                  className={`shrink-0 border-l border-outline-variant/40 bg-white ${
                    i % 2 === 1 ? TIMETABLE_HEADER_CELL_STRIPE_CLASS : ''
                  } ${isFocus ? '!bg-depot-blue-light/15' : ''}`}
                >
                  {compact && onPickDay ? (
                    <button
                      type="button"
                      onClick={() => onPickDay(day)}
                      className={`block w-full ${TIMETABLE_COLUMN_HEADER_CLASS} ${
                        onPickDay ? 'hover:text-depot-navy' : ''
                      }`}
                      title={`Open ${formatTripDate(day)}`}
                    >
                      <span className="block">{d.getDate()}</span>
                      <span className="font-normal normal-case text-on-surface-variant/80">
                        {weekday}
                      </span>
                    </button>
                  ) : (
                    <div className={TIMETABLE_COLUMN_HEADER_CLASS}>
                      <span className="block">{weekday}</span>
                      <span className="font-normal normal-case text-on-surface-variant/80">
                        {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {routeRows.length === 0 ? (
            <p className="p-8 text-center text-sm text-on-surface-variant">
              No active routes to display. Add or activate routes in Route Management.
            </p>
          ) : (
            routeRows.map((route) => {
              const routeLabel = formatRouteEndpointsLabel(route)
              const tripCount = dayColumns.reduce(
                (sum, day) => sum + tripsFor(route._id, day).length,
                0
              )
              return (
                <div key={route._id} className={TIMETABLE_DATA_ROW_CLASS}>
                  <div className={`${ROUTE_COLUMN_CLASS} group-hover:bg-surface-container`}>
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
                  </div>
                  {dayColumns.map((day, i) => {
                    const trips = tripsFor(route._id, day)
                    const isFocus = day === focusDate
                    return (
                      <div
                        key={day}
                        style={dayColumnStyle}
                        className={`min-h-24 shrink-0 border-l border-outline-variant/20 px-2 py-2 ${
                          i % 2 === 1 ? 'bg-surface-container/20' : ''
                        } ${isFocus ? 'bg-depot-blue-light/5' : ''}`}
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
                                    title={[
                                      formatRouteEndpointsLabel(trip.routeId),
                                      formatScheduleStatusLabel(trip.status),
                                      scheduleCode(trip),
                                      formatTimeRange(trip.departureTime, trip.arrivalTime),
                                      trip.busId?.regNumber,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                    className={`${timetableTripButtonClass({ selected })} min-w-0`}
                                    style={{ minWidth: dayColumnPx - 16 }}
                                  >
                                    <div className="flex items-start justify-between gap-1.5">
                                      <span className="min-w-0 flex-1 font-mono text-[11px] font-bold leading-tight tabular-nums whitespace-nowrap">
                                        {formatTimeRange(trip.departureTime, trip.arrivalTime)}
                                      </span>
                                      <span className="max-w-[3.5rem] shrink-0 truncate text-[10px] opacity-80">
                                        {trip.driverId?.name?.split(' ')[0] || ''}
                                      </span>
                                    </div>
                                    {trip.busId?.regNumber ? (
                                      <span className="mt-0.5 block text-[10px] leading-snug opacity-90 break-words">
                                        {trip.busId.regNumber}
                                      </span>
                                    ) : null}
                                    <span className="mt-1 inline-block max-w-full truncate rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-tight">
                                      {formatScheduleStatusLabel(trip.status)}
                                    </span>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>
      {footerNote ? (
        <p className="shrink-0 border-t border-outline-variant bg-surface-container/30 px-4 py-2 text-xs text-on-surface-variant">
          {footerNote}
        </p>
      ) : null}
    </div>
  )
}

export default ScheduleRouteTimetable
