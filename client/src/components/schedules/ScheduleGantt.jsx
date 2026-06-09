import Icon from '../Icon'
import {
  GANTT_HOURS,
  GANTT_HOUR_COLUMN_MIN_PX,
  GANTT_TIMELINE_WIDTH_PX,
  ganttPosition,
  ganttReturnLegPosition,
  getResourceBusyEndTime,
  formatRouteEndpointsLabel,
  formatScheduleStatusLabel,
  scheduleCode,
} from '../../utils/scheduleHelpers'

const ROUTE_COLUMN_CLASS =
  'sticky left-0 z-20 w-56 shrink-0 border-r border-outline-variant bg-white p-3'
const ROUTE_HEADER_CLASS =
  'sticky left-0 z-40 w-56 shrink-0 border-r border-outline-variant bg-depot-navy/5 p-3 text-xs font-bold uppercase tracking-wide text-depot-navy'

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
    <div className="glass-subtle flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="w-max min-w-full">
          <div className="sticky top-0 z-30 flex border-b border-outline-variant bg-white/95 backdrop-blur-sm">
            <div className={ROUTE_HEADER_CLASS}>Route</div>
            <div
              className="grid shrink-0 divide-x divide-outline-variant/40"
              style={timelineGridStyle}
            >
              {GANTT_HOURS.map((h, i) => (
                <div
                  key={h}
                  className={`px-1 py-2.5 text-center text-xs font-semibold tabular-nums tracking-wide text-on-surface-variant ${
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
                <div
                  key={row._id}
                  className="group flex border-b border-outline-variant transition-colors hover:bg-surface-container/50"
                >
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
                            className={`absolute top-1.5 bottom-1.5 z-10 overflow-hidden rounded px-2 py-2 text-left text-white shadow-sm transition-all ${
                              isConflict
                                ? 'border-2 border-dashed border-red-600 bg-depot-navy schedule-conflict-hatch'
                                : isSelected
                                  ? 'bg-depot-blue-light ring-2 ring-depot-navy ring-offset-1'
                                  : 'bg-depot-navy hover:bg-depot-navy/85'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="truncate text-xs font-bold">{tripRouteLabel}</span>
                              <span className="shrink-0 text-[10px] opacity-80">
                                {trip.driverId?.name?.split(' ')[0] || ''}
                              </span>
                            </div>
                            <p className="mt-0.5 font-mono text-[11px] leading-tight tabular-nums">
                              {trip.departureTime} – {trip.arrivalTime}
                            </p>
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
