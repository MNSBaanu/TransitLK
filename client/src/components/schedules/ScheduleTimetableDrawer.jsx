import Icon from '../Icon'
import {
  formatPeriodLabel,
  formatTimeRange,
  getTimetableDates,
  getTimetableRowValidationIssues,
  validateTimeRange,
} from '../../utils/scheduleHelpers'

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-900'
const labelClass = 'text-[10px] font-bold uppercase tracking-wide text-on-surface-variant'

function ScheduleTimetableDrawer({
  open,
  onClose,
  period,
  onPeriodChange,
  anchorDate,
  onAnchorDateChange,
  rows,
  onRowChange,
  onToggleAll,
  buses,
  drivers,
  saving,
  error,
  onSubmit,
  tripCount,
  conflictPreview,
  checkingConflicts,
  rowConflictHints,
  canCreateTimetable = false,
}) {
  if (!open) return null

  const periodLabel = formatPeriodLabel(period, anchorDate)
  const dates = getTimetableDates(period, anchorDate)
  const validationBlock = (conflictPreview?.issues || []).find(
    (issue) => issue.routeName === 'Validation'
  )
  const validationMessages = (validationBlock?.conflicts || []).map((c) => c.message)

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-5xl flex-col bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Create timetable</h3>
            <p className="text-sm text-on-surface-variant">
              Each included route needs departure and arrival times, a bus, and a driver before
              the timetable can be created. Overlaps are checked automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-surface-container"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 space-y-4 border-b border-outline-variant px-5 py-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            {checkingConflicts && (
              <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Icon name="schedule" size={18} className="animate-pulse" />
                Checking bus, driver, and route overlaps...
              </p>
            )}

            {!checkingConflicts && validationMessages.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                <p className="flex items-center gap-2 font-semibold">
                  <Icon name="warning" size={18} />
                  Assign a bus and driver for every included route — save blocked
                </p>
                <ul className="mt-2 max-h-28 list-inside list-disc overflow-y-auto text-xs">
                  {validationMessages.slice(0, 8).map((message, i) => (
                    <li key={i}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {!checkingConflicts &&
              conflictPreview?.hasConflict &&
              validationMessages.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="flex items-center gap-2 font-semibold">
                  <Icon name="warning" size={18} />
                  {conflictPreview.conflictCount || conflictPreview.issues?.length} scheduling
                  conflict(s) — save blocked
                </p>
                <ul className="mt-2 max-h-28 list-inside list-disc overflow-y-auto text-xs">
                  {(conflictPreview.issues || []).slice(0, 8).map((issue, i) => (
                    <li key={i}>
                      <span className="font-medium">{issue.routeName}</span>
                      {issue.tripDate ? ` (${issue.tripDate})` : ''}:{' '}
                      {(issue.conflicts || []).map((c) => c.message).join('; ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!checkingConflicts && canCreateTimetable && (
              <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <Icon name="check_circle" size={18} />
                Ready to create — all routes assigned with no overlaps
              </p>
            )}

            <div className="flex flex-wrap items-end gap-4">
              <div>
                <span className={`${labelClass} mb-2 block`}>Timetable period</span>
                <div className="pro-segmented">
                  {['daily', 'weekly', 'monthly'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onPeriodChange(mode)}
                      className={`rounded-md px-4 py-2 text-sm capitalize transition-colors ${
                        period === mode
                          ? 'pro-segmented-active'
                          : 'text-fleet-ink-muted hover:text-fleet-ink'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block min-w-[160px]">
                <span className={`${labelClass} mb-1 block`}>
                  {period === 'daily' ? 'Trip date' : period === 'weekly' ? 'Week of' : 'Month'}
                </span>
                <input
                  type="date"
                  value={anchorDate}
                  onChange={(e) => onAnchorDateChange(e.target.value)}
                  required
                  className={inputClass}
                />
              </label>
              <div className="rounded-lg border border-depot-blue-light/30 bg-depot-blue-light/5 px-3 py-2 text-sm">
                <p className="text-xs font-semibold uppercase text-depot-blue-light">Coverage</p>
                <p className="font-semibold text-neutral-900">{periodLabel}</p>
                <p className="text-xs text-on-surface-variant">
                  {dates.length} day{dates.length !== 1 ? 's' : ''} · {tripCount} draft trip
                  {tripCount !== 1 ? 's' : ''} planned
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-on-surface-variant">
                No active routes. Activate routes in Route Management before creating a timetable.
              </p>
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left">
                    <th className="w-10 pb-2">
                      <input
                        type="checkbox"
                        checked={rows.every((r) => r.included)}
                        onChange={(e) => onToggleAll(e.target.checked)}
                        className="h-4 w-4 rounded border-outline-variant"
                        title="Include all routes"
                      />
                    </th>
                    <th className={`${labelClass} pb-2 pr-3`}>Route</th>
                    <th className={`${labelClass} pb-2 pr-2`}>Departure</th>
                    <th className={`${labelClass} pb-2 pr-2`}>Arrival</th>
                    <th className={`${labelClass} pb-2 pr-2`}>Window</th>
                    <th className={`${labelClass} pb-2 pr-2`}>Bus</th>
                    <th className={`${labelClass} pb-2`}>Driver</th>
                    <th className={`${labelClass} pb-2`}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {rows.map((row) => {
                    const timeErr = row.included
                      ? validateTimeRange(row.departureTime, row.arrivalTime)
                      : null
                    const rowHints = rowConflictHints?.get?.(String(row.routeId)) || []
                    const rowValidation = row.included ? getTimetableRowValidationIssues(row) : []
                    const hasRowConflict =
                      row.included && (timeErr || rowHints.length > 0 || rowValidation.length > 0)
                    const missingBus = row.included && !row.busId
                    const missingDriver = row.included && !row.driverId
                    const rowBuses = buses.filter(
                      (b) =>
                        (b.status === 'available' || b.status === 'in-service') &&
                        (!row.serviceType || !b.serviceType || b.serviceType === row.serviceType)
                    )
                    const rowDrivers = drivers.filter(
                      (d) => d.status === 'available' || !d.status
                    )
                    return (
                      <tr
                        key={row.routeId}
                        className={`${row.included ? '' : 'opacity-50'} ${
                          hasRowConflict ? 'bg-red-50/60' : ''
                        }`}
                      >
                        <td className="py-3 pr-2 align-top">
                          <input
                            type="checkbox"
                            checked={row.included}
                            onChange={(e) =>
                              onRowChange(row.routeId, 'included', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-outline-variant"
                          />
                        </td>
                        <td className="py-3 pr-3 align-top">
                          <p className="font-semibold text-neutral-900">{row.routeName}</p>
                          <p className="text-xs text-on-surface-variant">
                            {row.startPoint} → {row.endPoint}
                            {row.distance != null ? ` · ${row.distance} km` : ''}
                          </p>
                        </td>
                        <td className="py-3 pr-2 align-top">
                          <input
                            type="time"
                            value={row.departureTime}
                            onChange={(e) =>
                              onRowChange(row.routeId, 'departureTime', e.target.value)
                            }
                            disabled={!row.included}
                            required={row.included}
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 pr-2 align-top">
                          <input
                            type="time"
                            value={row.arrivalTime}
                            onChange={(e) =>
                              onRowChange(row.routeId, 'arrivalTime', e.target.value)
                            }
                            disabled={!row.included}
                            required={row.included}
                            className={inputClass}
                          />
                        </td>
                        <td className="py-3 pr-2 align-top">
                          {timeErr ? (
                            <span className="text-xs text-red-600">{timeErr}</span>
                          ) : (
                            <span className="text-xs font-medium text-neutral-800">
                              {formatTimeRange(row.departureTime, row.arrivalTime)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-2 align-top">
                          <select
                            value={row.busId}
                            onChange={(e) =>
                              onRowChange(row.routeId, 'busId', e.target.value)
                            }
                            disabled={!row.included}
                            required={row.included}
                            className={`${inputClass}${missingBus ? ' border-red-400' : ''}`}
                          >
                            <option value="">Select bus</option>
                            {rowBuses.map((b) => (
                              <option key={b._id} value={b._id}>
                                {b.regNumber}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 align-top">
                          <select
                            value={row.driverId}
                            onChange={(e) =>
                              onRowChange(row.routeId, 'driverId', e.target.value)
                            }
                            disabled={!row.included}
                            required={row.included}
                            className={`${inputClass}${missingDriver ? ' border-red-400' : ''}`}
                          >
                            <option value="">Select driver</option>
                            {rowDrivers.map((d) => (
                              <option key={d._id} value={d._id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 align-top">
                          {hasRowConflict ? (
                            <div className="max-w-[140px]">
                              <span className="flex items-center gap-1 text-xs font-semibold text-red-700">
                                <Icon name="warning" size={14} />
                                {rowValidation.length && !timeErr && !rowHints.length
                                  ? 'Incomplete'
                                  : 'Conflict'}
                              </span>
                              <ul className="mt-1 list-disc pl-3 text-[10px] text-red-600">
                                {rowValidation.map((issue, vi) => (
                                  <li key={`v-${vi}`}>{issue}</li>
                                ))}
                                {rowHints.slice(0, 2).map((hint, hi) => (
                                  <li key={hi}>{hint}</li>
                                ))}
                              </ul>
                            </div>
                          ) : row.included ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-700">
                              <Icon name="check_circle" size={14} />
                              Clear
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-outline-variant bg-white px-5 py-4">
            <p className="text-xs text-on-surface-variant">
              Every included route needs a bus and driver. Trips with overlaps cannot be saved.
            </p>
            <button
              type="submit"
              disabled={
                saving ||
                rows.length === 0 ||
                tripCount === 0 ||
                checkingConflicts ||
                !canCreateTimetable
              }
              className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Creating timetable...'
                : `Create ${period} timetable (${tripCount} trips)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ScheduleTimetableDrawer
