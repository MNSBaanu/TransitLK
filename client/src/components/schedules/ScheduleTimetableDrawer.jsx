import { useCallback, useEffect, useState } from 'react'
import Icon from '../Icon'
import {
  formatTimeRange,
  getTimetableDates,
  getTimetableRowValidationIssues,
  getTimetableRowStatus,
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
  onRefresh,
  refreshing = false,
}) {
  const [focusedRouteId, setFocusedRouteId] = useState(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const focusRouteRow = useCallback(
    (routeId) => {
      const id = String(routeId)
      setFocusedRouteId(id)
      window.requestAnimationFrame(() => {
        const rowEl = document.getElementById(`timetable-row-${id}`)
        rowEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const focusField =
          rowEl?.querySelector('[data-focus-priority]') ||
          rowEl?.querySelector('select:not([disabled]), input:not([disabled])')
        focusField?.focus({ preventScroll: true })
      })
    },
    []
  )

  useEffect(() => {
    if (!focusedRouteId) return undefined
    const timer = window.setTimeout(() => setFocusedRouteId(null), 4500)
    return () => window.clearTimeout(timer)
  }, [focusedRouteId])

  useEffect(() => {
    if (!open) {
      setFeedbackOpen(false)
      return undefined
    }
    return undefined
  }, [open])

  useEffect(() => {
    if (error) setFeedbackOpen(true)
  }, [error])

  if (!open) return null

  const dates = getTimetableDates(period, anchorDate)
  const dateFieldLabel =
    period === 'daily' ? 'Trip date' : period === 'weekly' ? 'Week of' : 'Month'
  const validationBlock = (conflictPreview?.issues || []).find(
    (issue) => issue.routeName === 'Validation'
  )
  const validationMessages = (validationBlock?.conflicts || []).map((c) => c.message)
  const overlapIssues =
    validationMessages.length === 0 ? conflictPreview?.issues || [] : []

  const routeIssueCards = (() => {
    const cards = new Map()
    const ensure = (routeId, routeName) => {
      const key = String(routeId || routeName)
      if (!cards.has(key)) {
        cards.set(key, { routeId, routeName: routeName || 'Route', items: [] })
      }
      return cards.get(key)
    }

    for (const row of rows.filter((r) => r.included)) {
      const card = ensure(row.routeId, row.routeName)
      for (const text of getTimetableRowValidationIssues(row)) {
        card.items.push({ kind: 'validation', text })
      }
      for (const text of rowConflictHints?.get?.(String(row.routeId)) || []) {
        card.items.push({ kind: 'conflict', text })
      }
    }

    for (const issue of overlapIssues) {
      const card = ensure(issue.routeId, issue.routeName)
      for (const c of issue.conflicts || []) {
        const text = issue.tripDate ? `${issue.tripDate}: ${c.message}` : c.message
        card.items.push({ kind: 'conflict', text })
      }
    }

    return [...cards.values()].filter((card) => card.items.length > 0)
  })()

  const hasStatusPanel =
    Boolean(error) || checkingConflicts || routeIssueCards.length > 0 || canCreateTimetable

  const issueCount = routeIssueCards.length
  const hasConflictIssues = routeIssueCards.some((card) =>
    card.items.some((item) => item.kind === 'conflict')
  )
  const showIssueBadge = issueCount > 0 || Boolean(error) || checkingConflicts

  const feedbackPanel = (
      <aside
        className="flex h-[42vh] min-h-0 w-full flex-1 flex-col border-r border-outline-variant bg-surface-container/40 shadow-2xl lg:h-full lg:min-w-0"
        aria-label="Timetable status and errors"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant bg-white px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-neutral-900">Timetable feedback</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={!onRefresh || refreshing}
              className="flex items-center gap-1.5 rounded-lg border border-outline-variant bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="refresh" size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setFeedbackOpen(false)}
              className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
              aria-label="Close"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
          {!hasStatusPanel ? (
            <div className="rounded-xl border border-outline-variant bg-white px-4 py-6 text-sm text-on-surface-variant">
              <p className="font-semibold text-neutral-900">No issues yet</p>
              <p className="mt-2 leading-relaxed">
                Validation messages and scheduling conflicts appear here as you edit routes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
                  <p className="flex items-center gap-2 font-semibold">
                    <Icon name="error" size={18} className="text-red-600" />
                    Could not save timetable
                  </p>
                  <p className="mt-2 leading-relaxed">{error}</p>
                </div>
              )}

              {checkingConflicts && (
                <div className="rounded-xl border border-white/25 bg-white/95 px-4 py-3 text-sm text-neutral-800 shadow-lg">
                  <p className="flex items-center gap-2 font-medium">
                    <Icon name="schedule" size={18} className="animate-pulse text-depot-blue-light" />
                    Checking bus, driver, and route overlaps...
                  </p>
                </div>
              )}

              {!checkingConflicts && routeIssueCards.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {routeIssueCards.length} route{routeIssueCards.length !== 1 ? 's' : ''} need
                    attention
                  </p>
                  {routeIssueCards.map((card) => {
                    const isConflict = card.items.some((item) => item.kind === 'conflict')
                    return (
                      <div
                        key={String(card.routeId)}
                        className={`rounded-lg border border-l-4 px-4 py-3 text-sm shadow-lg ${
                          isConflict
                            ? 'border-red-200 border-l-red-600 bg-red-50'
                            : 'border-amber-200 border-l-amber-500 bg-amber-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide ${
                                isConflict ? 'text-red-700' : 'text-amber-800'
                              }`}
                            >
                              <Icon
                                name="warning"
                                size={16}
                                className={isConflict ? 'text-red-600' : 'text-amber-600'}
                              />
                              {isConflict ? 'Route conflict' : 'Incomplete'}
                            </p>
                            <p className="mt-1 font-semibold text-neutral-900">{card.routeName}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackOpen(false)
                              focusRouteRow(card.routeId)
                            }}
                            className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                              isConflict
                                ? 'border-red-300 bg-white text-red-700 hover:bg-red-100'
                                : 'border-amber-300 bg-white text-amber-900 hover:bg-amber-100'
                            }`}
                          >
                            {isConflict ? 'Fix conflict' : 'Complete'}
                          </button>
                        </div>
                        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-neutral-900">
                          {card.items.map((item, i) => (
                            <li
                              key={i}
                              className={`rounded-md border bg-white/60 px-2.5 py-1.5 ${
                                item.kind === 'conflict'
                                  ? 'border-red-200/80 text-red-800'
                                  : 'border-amber-200/80 text-amber-900'
                              }`}
                            >
                              {item.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}

              {!checkingConflicts && canCreateTimetable && (
                <div className="rounded-xl border border-emerald-300/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg">
                  <p className="flex items-center gap-2 font-semibold">
                    <Icon name="check_circle" size={18} />
                    Ready to create
                  </p>
                  <p className="mt-2 leading-relaxed">
                    All included routes have a bus and driver assigned with no overlaps detected.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
  )

  return (
    <div
      className={`fixed inset-0 z-[100] flex bg-black/30 backdrop-blur-sm ${
        feedbackOpen ? 'flex-col-reverse lg:flex-row' : 'justify-end'
      }`}
    >
      {feedbackOpen && feedbackPanel}

      <div
        className={`flex min-h-0 shrink-0 flex-col bg-white shadow-2xl lg:max-w-5xl ${
          feedbackOpen ? 'h-[58vh] w-full lg:h-full' : 'h-full w-full lg:w-auto'
        }`}
      >
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <button
                type="button"
                onClick={onClose}
                className="mt-0.5 shrink-0 rounded-lg p-2 hover:bg-surface-container"
                aria-label="Back to schedule"
              >
                <Icon name="arrow_back" size={22} />
              </button>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-neutral-900">Create timetable</h3>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setFeedbackOpen((open) => !open)}
                className={`relative rounded-lg border p-2 transition-colors ${
                  feedbackOpen ? 'ring-2 ring-depot-blue-light/40' : ''
                } ${
                  showIssueBadge
                    ? hasConflictIssues
                      ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                      : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : canCreateTimetable
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container'
                }`}
                aria-label="View timetable feedback"
                title="View issues and validation feedback"
              >
                <Icon name="report_problem" size={22} />
                {issueCount > 0 && (
                  <span
                    className={`absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                      hasConflictIssues ? 'bg-red-600' : 'bg-amber-500'
                    }`}
                  >
                    {issueCount}
                  </span>
                )}
              </button>
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
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
          <div className="shrink-0 border-b border-outline-variant bg-surface-container/40 px-5 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
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
                <label className="block min-w-[11rem]">
                  <span className={`${labelClass} mb-1 block`}>{dateFieldLabel}</span>
                  {period === 'monthly' ? (
                    <input
                      type="month"
                      value={anchorDate.slice(0, 7)}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value) onAnchorDateChange(`${value}-01`)
                      }}
                      required
                      className={inputClass}
                    />
                  ) : (
                    <input
                      type="date"
                      value={anchorDate}
                      onChange={(e) => onAnchorDateChange(e.target.value)}
                      required
                      className={inputClass}
                    />
                  )}
                </label>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-lg border border-outline-variant bg-white px-4 py-2.5 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-depot-blue-light/10 text-depot-blue-light">
                  <Icon name="event" size={20} />
                </div>
                <div>
                  <p className={`${labelClass} mb-0.5`}>Coverage</p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {dates.length} day{dates.length !== 1 ? 's' : ''}
                    <span className="mx-1.5 font-normal text-on-surface-variant">·</span>
                    {tripCount} draft trip{tripCount !== 1 ? 's' : ''}
                  </p>
                </div>
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
                    const rowStatus = getTimetableRowStatus(row, { overlapHints: rowHints })
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
                    const isFocused = String(row.routeId) === focusedRouteId
                    const focusField =
                      missingBus ? 'bus' : missingDriver ? 'driver' : timeErr ? 'departure' : 'bus'
                    return (
                      <tr
                        id={`timetable-row-${row.routeId}`}
                        key={row.routeId}
                        className={`transition-colors duration-300 ${
                          row.included ? '' : 'opacity-50'
                        } ${
                          isFocused
                            ? rowStatus === 'conflict'
                              ? 'bg-red-50 ring-2 ring-inset ring-red-600'
                              : rowStatus === 'incomplete'
                                ? 'bg-amber-50 ring-2 ring-inset ring-amber-500'
                                : 'bg-depot-blue-light/15 ring-2 ring-inset ring-depot-blue-light'
                            : rowStatus === 'conflict'
                              ? 'bg-red-50/60'
                              : rowStatus === 'incomplete'
                                ? 'bg-amber-50/60'
                                : ''
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
                            data-field="departure"
                            {...(focusField === 'departure' ? { 'data-focus-priority': true } : {})}
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
                            data-field="bus"
                            {...(focusField === 'bus' ? { 'data-focus-priority': true } : {})}
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
                            data-field="driver"
                            {...(focusField === 'driver' ? { 'data-focus-priority': true } : {})}
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
                          {rowStatus === 'conflict' ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-700">
                              <Icon name="warning" size={14} className="text-red-600" />
                              Conflict
                            </span>
                          ) : rowStatus === 'incomplete' ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-800">
                              <Icon name="warning" size={14} className="text-amber-600" />
                              Incomplete
                            </span>
                          ) : rowStatus === 'clear' ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <Icon name="check_circle" size={14} />
                              Clear
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant">Excluded</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default ScheduleTimetableDrawer
