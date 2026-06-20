import Icon from '../Icon'
import { formatTimeRange, formatRouteStopsLabel, minimumDepartureTimeForDate, validateTimeRange } from '../../utils/scheduleHelpers'
import ScheduleTimeInput from './ScheduleTimeInput'

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-on-surface-variant'

function ScheduleAddDrawer({
  open,
  onClose,
  form,
  onChange,
  routes,
  buses,
  drivers,
  saving,
  error,
  onSubmit,
  repeatWeek,
  onRepeatWeekChange,
  conflictPreview,
  selectedRoute,
}) {
  if (!open) return null

  const timeError = validateTimeRange(form.departureTime, form.arrivalTime)
  const minDepartureTime = minimumDepartureTimeForDate(form.tripDate)
  const hasConflict = conflictPreview?.hasConflict || Boolean(timeError)
  const conflictMessages = [
    ...(timeError ? [timeError] : []),
    ...(conflictPreview?.conflicts?.map((c) => c.message) || []),
  ]

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-md flex-col bg-white shadow-2xl sm:max-w-md">
        <div className="flex items-center justify-between border-b border-outline-variant p-5">
          <h3 className="text-lg font-bold text-neutral-900">New schedule entry</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-surface-container"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            {hasConflict && conflictMessages.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="font-semibold">Conflict check</p>
                <ul className="mt-1 list-inside list-disc text-xs">
                  {conflictMessages.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">Saving is blocked until overlaps are resolved.</p>
              </div>
            )}

            <label className="block">
              <span className={`${labelClass} mb-1 block`}>Route selection</span>
              <select name="routeId" value={form.routeId} onChange={onChange} required className={inputClass}>
                <option value="">Choose route</option>
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.routeName} ({r.startPoint} → {r.endPoint})
                  </option>
                ))}
              </select>
            </label>

            {selectedRoute && (
              <div className="rounded-lg border border-outline-variant bg-surface-container/50 px-3 py-2 text-sm">
                <p className="text-xs font-semibold uppercase text-on-surface-variant">Route</p>
                <p className="font-semibold text-neutral-900">{selectedRoute.routeName}</p>
                <p className="text-on-surface-variant">
                  {selectedRoute.startPoint} → {selectedRoute.endPoint} · {selectedRoute.distance} km
                </p>
                {formatRouteStopsLabel(selectedRoute) ? (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Stops: {formatRouteStopsLabel(selectedRoute)}
                  </p>
                ) : null}
              </div>
            )}

            <label className="block">
              <span className={`${labelClass} mb-1 block`}>Trip date</span>
              <input
                name="tripDate"
                type="date"
                value={form.tripDate}
                onChange={onChange}
                required
                className={inputClass}
              />
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant px-3 py-2.5">
              <input
                type="checkbox"
                checked={repeatWeek}
                onChange={(e) => onRepeatWeekChange(e.target.checked)}
                className="h-4 w-4 rounded border-outline-variant"
              />
              <span className="text-sm text-neutral-900">
                Repeat for full week (Mon–Sun) with same times
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={`${labelClass} mb-1 block`}>Departure</span>
                <ScheduleTimeInput
                  name="departureTime"
                  value={form.departureTime}
                  onChange={(next) =>
                    onChange({ target: { name: 'departureTime', value: next } })
                  }
                  minTime={minDepartureTime}
                  required
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={`${labelClass} mb-1 block`}>Arrival</span>
                <ScheduleTimeInput
                  name="arrivalTime"
                  value={form.arrivalTime}
                  onChange={(next) =>
                    onChange({ target: { name: 'arrivalTime', value: next } })
                  }
                  required
                  className={inputClass}
                />
              </label>
            </div>

            {!timeError && form.departureTime && form.arrivalTime && (
              <p className="text-xs text-on-surface-variant">
                Scheduled window: {formatTimeRange(form.departureTime, form.arrivalTime)}
              </p>
            )}

            <div>
              <span className={`${labelClass} mb-2 block`}>Resource assignment</span>
              <div className="space-y-3">
                <div className="relative">
                  <Icon
                    name="directions_bus"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    size={20}
                  />
                  <select
                    name="busId"
                    value={form.busId}
                    onChange={onChange}
                    required
                    className={`${inputClass} pl-10`}
                  >
                    <option value="">Choose bus</option>
                    {buses.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.regNumber} ({b.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <Icon
                    name="person"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    size={20}
                  />
                  <select
                    name="driverId"
                    value={form.driverId}
                    onChange={onChange}
                    required
                    className={`${inputClass} pl-10`}
                  >
                    <option value="">Choose driver</option>
                    {drivers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.status || 'available'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-outline-variant bg-white p-5">
            <button
              type="submit"
              disabled={saving || hasConflict}
              className="w-full rounded-xl bg-depot-blue-light px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-depot-blue-light-hover disabled:opacity-60"
            >
              {saving
                ? 'Saving draft...'
                : repeatWeek
                  ? 'Save weekly drafts (7 days)'
                  : 'Save as draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ScheduleAddDrawer
