import Icon from '../Icon'
import {
  formatScheduleStatusLabel,
  formatTimeRange,
  getMonthDayDates,
  scheduleCode,
  parseLocalDateInput,
  scheduleStatusClass,
  toDateInputValue,
  tripDateKey,
} from '../../utils/scheduleHelpers'

function ScheduleMonthOverview({ schedules, anchorDate, selectedId, onSelectTrip, onPickDay }) {
  const monthDays = getMonthDayDates(anchorDate)
  const firstDow = parseLocalDateInput(monthDays[0]).getDay()
  const padStart = firstDow === 0 ? 6 : firstDow - 1

  const byDay = new Map()
  for (const s of schedules) {
    const key = tripDateKey(s)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(s)
  }

  const cells = [...Array(padStart).fill(null), ...monthDays]

  return (
    <div>
      <div className="mb-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((dayKey, idx) => {
          if (!dayKey) {
            return <div key={`pad-${idx}`} className="min-h-[100px] rounded-lg bg-transparent" />
          }
          const trips = (byDay.get(dayKey) || []).sort((a, b) =>
            a.departureTime.localeCompare(b.departureTime)
          )
          const isToday = dayKey === toDateInputValue(new Date())
          return (
            <div
              key={dayKey}
              className={`flex min-h-[100px] flex-col rounded-lg border p-2 ${
                isToday ? 'border-depot-navy bg-depot-navy/5' : 'border-outline-variant bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => onPickDay(dayKey)}
                className="mb-1 flex items-center justify-between text-left text-xs font-bold text-neutral-900 hover:underline"
              >
                {parseLocalDateInput(dayKey).getDate()}
                {trips.length > 0 && (
                  <span className="rounded-full bg-depot-navy px-1.5 py-0.5 text-[10px] text-white">
                    {trips.length}
                  </span>
                )}
              </button>
              <ul className="flex-1 space-y-1 overflow-y-auto">
                {trips.slice(0, 3).map((trip) => (
                  <li key={trip._id}>
                    <button
                      type="button"
                      onClick={() => onSelectTrip(trip)}
                      className={`w-full rounded px-1.5 py-1 text-left text-xs leading-snug ${
                        selectedId === trip._id
                          ? 'bg-depot-blue-light text-white'
                          : 'bg-surface-container hover:bg-depot-navy/10'
                      }`}
                    >
                      <span className="block font-semibold tabular-nums">
                        {formatTimeRange(trip.departureTime, trip.arrivalTime)}
                      </span>
                      <span className="block truncate opacity-90">
                        {trip.routeId?.routeName || scheduleCode(trip)}
                      </span>
                      <span
                        className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          selectedId === trip._id
                            ? 'bg-white/20 text-white'
                            : scheduleStatusClass(trip.status)
                        }`}
                      >
                        {formatScheduleStatusLabel(trip.status)}
                      </span>
                    </button>
                  </li>
                ))}
                {trips.length > 3 && (
                  <li className="text-[10px] text-on-surface-variant">+{trips.length - 3} more</li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">
        <Icon name="info" size={16} />
        {formatPeriodLabelMonth(anchorDate)} — click a day to open the daily Gantt view.
      </p>
    </div>
  )
}

function formatPeriodLabelMonth(anchorDate) {
  return new Date(anchorDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default ScheduleMonthOverview
