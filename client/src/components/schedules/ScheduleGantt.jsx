import Icon from '../Icon'
import {
  ROUTE_COLUMN_CLASS,
  ROUTE_HEADER_CLASS,
  TIMETABLE_COLUMN_HEADER_CLASS,
  TIMETABLE_DATA_ROW_CLASS,
  TIMETABLE_HEADER_ROW_CLASS,
  TIMETABLE_SCROLL_CLASS,
  TIMETABLE_SHELL_CLASS,
  timetableTripButtonClass,
} from './scheduleTimetableShared'
import {
  GANTT_HOURS,
  GANTT_HOUR_COLUMN_MIN_PX,
  GANTT_TIMELINE_WIDTH_PX,
  ganttPosition,
  ganttReturnLegPosition,
  getResourceBusyEndTime,
  formatRouteEndpointsLabel,
  formatScheduleStatusLabel,
  formatTimeRange,
  scheduleCode,
} from '../../utils/scheduleHelpers'

const timelineGridStyle = {
  display: 'grid',
  gridTemplateColumns: `repeat(${GANTT_HOURS.length}, ${GANTT_HOUR_COLUMN_MIN_PX}px)`,
  width: GANTT_TIMELINE_WIDTH_PX,
}

function ScheduleGantt({ rows, selectedId, conflictPairs, onSelectTrip }) {
  const conflictIds = new Set()
  conflictPairs.forEach((c) => {
    conflictIds.add(c.a._id)
    conflictIds.add(c.b._id)
  })

  return (
    <div className={TIMETABLE_SHELL_CLASS}>
      <div className={TIMETABLE_SCROLL_CLASS}>
        <div className="w-max min-w-full">
          <div className={TIMETABLE_HEADER_ROW_CLASS}>
            <div className={ROUTE_HEADER_CLASS}>Route</div>
            <div
              className="grid shrink-0 divide-x divide-outline-variant/40"
              style={timelineGridStyle}
            >
              {GANTT_HOURS.map((h, i) => (
                <div
                  key={h}
                  className={`${TIMETABLE_COLUMN_HEADER_CLASS} ${
                    i % 2 === 1 ? 'bg-surface-container/50' : ''
                  }`}
                >
                  {h}
                </div>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-on-surface-variant">
              No active routes to display. Add or activate routes in Route Management.
            </p>
          ) : (
            rows.map((row) => {
              const routeLabel = formatRouteEndpointsLabel(row)
              return (
                <div key={row._id} className={TIMETABLE_DATA_ROW_CLASS}>
                  <div className={`${ROUTE_COLUMN_CLASS} group-hover:bg-surface-container`}>
                    <div className="flex items-center gap-2">
                      <Icon name="map" size={20} className="shrink-0 text-depot-navy" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-neutral-900">{routeLabel}</p>
                        <p className="truncate text-[10px] text-on-surface-variant">
                          {row.trips.length
                            ? `${row.trips.length} trip${row.trips.length !== 1 ? 's' : ''} today`
                            : 'No trips today'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    className="relative h-24 shrink-0"
                    style={{ width: GANTT_TIMELINE_WIDTH_PX }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 grid divide-x divide-outline-variant/20"
                      style={timelineGridStyle}
                    >
                      {GANTT_HOURS.map((h) => (
                        <div key={h} />
                      ))}
                    </div>
                    {row.trips.map((trip) => {
                      const pos = ganttPosition(trip.departureTime, trip.arrivalTime)
                      const returnPos = ganttReturnLegPosition(
                        trip.departureTime,
                        trip.arrivalTime
                      )
                      if (!pos) return null
                      const isConflict = conflictIds.has(trip._id)
                      const isSelected = selectedId === trip._id
                      const tripRouteLabel = formatRouteEndpointsLabel(trip.routeId)
                      const busyEnd = getResourceBusyEndTime(
                        trip.departureTime,
                        trip.arrivalTime
                      )
                      return (
                        <div key={trip._id} className="contents">
                          {returnPos ? (
                            <div
                              style={returnPos.style}
                              title={`Return to depot until ${busyEnd}`}
                              className="pointer-events-none absolute top-1.5 bottom-1.5 z-[5] rounded border border-dashed border-depot-navy/30 bg-depot-navy/15"
                              aria-hidden
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onSelectTrip(trip)}
                            title={[
                              tripRouteLabel,
                              formatScheduleStatusLabel(trip.status),
                              scheduleCode(trip),
                              `${trip.departureTime} – ${trip.arrivalTime}`,
                              busyEnd ? `Busy until ${busyEnd} (return)` : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                            style={pos.style}
                            className={`absolute top-1.5 bottom-1.5 z-10 ${timetableTripButtonClass({
                              selected: isSelected,
                              conflict: isConflict,
                            })}`}
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
                              <span className="mt-0.5 block truncate text-[10px] leading-snug opacity-90">
                                {trip.busId.regNumber}
                              </span>
                            ) : null}
                            <span className="mt-0.5 inline-block rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-tight">
                              {formatScheduleStatusLabel(trip.status)}
                            </span>
                            {isConflict && (
                              <span className="mt-1 inline-block rounded bg-red-600 px-1.5 text-[10px] font-bold">
                                OVERLAP
                              </span>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default ScheduleGantt
