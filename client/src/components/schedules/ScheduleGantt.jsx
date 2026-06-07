import Icon from '../Icon'
import {
  GANTT_HOURS,
  ganttPosition,
  formatRouteEndpointsLabel,
  scheduleCode,
} from '../../utils/scheduleHelpers'

function ScheduleGantt({ rows, selectedId, conflictPairs, onSelectTrip }) {
  const conflictIds = new Set()
  conflictPairs.forEach((c) => {
    conflictIds.add(c.a._id)
    conflictIds.add(c.b._id)
  })

  return (
    <div className="glass-subtle flex flex-1 flex-col overflow-hidden rounded-lg">
      <div className="sticky top-0 z-30 flex border-b border-outline-variant">
        <div className="w-56 shrink-0 border-r border-outline-variant bg-depot-navy/5 p-3 text-xs font-bold uppercase tracking-wide text-depot-navy">
          Resource / route
        </div>
        <div className="min-w-[900px] flex-1 overflow-hidden">
          <div
            className="grid divide-x divide-outline-variant/40"
            style={{ gridTemplateColumns: `repeat(${GANTT_HOURS.length}, minmax(48px, 1fr))` }}
          >
            {GANTT_HOURS.map((h, i) => (
              <div
                key={h}
                className={`p-2 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant ${
                  i % 2 === 1 ? 'bg-surface-container/50' : ''
                }`}
              >
                {h}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-on-surface-variant">
            No schedules for this date. Add a schedule to see trips on the timetable.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.busId}
              className="group flex border-b border-outline-variant transition-colors hover:bg-surface-container/50"
            >
              <div className="sticky left-0 z-20 w-56 shrink-0 border-r border-outline-variant bg-white p-3 group-hover:bg-surface-container">
                <div className="flex items-center gap-2">
                  <Icon name="directions_bus" size={20} className="text-depot-navy" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-neutral-900">
                      {row.regNumber}
                    </p>
                    <p className="truncate text-[10px] text-on-surface-variant">
                      {row.driverName || 'Unassigned driver'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative h-20 min-w-[900px] flex-1">
                <div
                  className="pointer-events-none absolute inset-0 grid divide-x divide-outline-variant/20"
                  style={{ gridTemplateColumns: `repeat(${GANTT_HOURS.length}, 1fr)` }}
                >
                  {GANTT_HOURS.map((h) => (
                    <div key={h} />
                  ))}
                </div>
                {row.trips.map((trip) => {
                  const pos = ganttPosition(trip.departureTime, trip.arrivalTime)
                  if (!pos) return null
                  const isConflict = conflictIds.has(trip._id)
                  const isSelected = selectedId === trip._id
                  const routeLabel = formatRouteEndpointsLabel(trip.routeId)
                  return (
                    <button
                      key={trip._id}
                      type="button"
                      onClick={() => onSelectTrip(trip)}
                      title={
                        [
                          routeLabel,
                          scheduleCode(trip),
                          `${trip.departureTime} – ${trip.arrivalTime}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      }
                      style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                      className={`absolute top-2 bottom-2 z-10 rounded p-2 text-left text-white shadow-sm transition-all ${
                        isConflict
                          ? 'border-2 border-dashed border-red-600 bg-depot-navy schedule-conflict-hatch'
                          : isSelected
                            ? 'bg-depot-blue-light ring-2 ring-depot-navy ring-offset-1'
                            : 'bg-depot-navy hover:bg-depot-navy/85'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="truncate text-[10px] font-bold">{routeLabel}</span>
                        <span className="text-[8px] opacity-80">
                          {trip.driverId?.name?.split(' ')[0] || ''}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[8px] leading-none">
                        {trip.departureTime} – {trip.arrivalTime}
                      </p>
                      {isConflict && (
                        <span className="mt-1 inline-block rounded bg-red-600 px-1 text-[8px] font-bold">
                          OVERLAP
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ScheduleGantt
