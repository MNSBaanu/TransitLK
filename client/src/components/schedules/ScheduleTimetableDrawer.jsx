import { useCallback, useEffect, useState } from 'react'
import Icon from '../Icon'
import {
  buildTimetableFeedbackCards,
  formatRouteEndpointsLabel,
  formatTimeRange,
  getResourceNextAvailableTime,
  getTimetableDates,
  getTimetableRowValidationIssues,
  getTimetableRowStatus,
  isResourceFreeForTrip,
  tripDateKey,
  validateTimeRange,
} from '../../utils/scheduleHelpers'
import { isDriverAssignable, isBusAssignable, defaultMinCapacityForService } from '../../utils/fleetHelpers'

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-100'
const labelClass = 'text-[10px] font-bold uppercase tracking-wide text-on-surface-variant'

function groupConsecutiveIndices(indices) {
  if (!indices.length) return []
  const sorted = [...indices].sort((a, b) => a - b)
  const groups = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === sorted[i - 1] + 1) {
      groups[groups.length - 1].push(sorted[i])
    } else {
      groups.push([sorted[i]])
    }
  }
  return groups
}

function getFocusedRowHighlight(rowIndex, focusedIndices, kind) {
  if (!focusedIndices.includes(rowIndex)) return null
  const group = groupConsecutiveIndices(focusedIndices).find((g) => g.includes(rowIndex))
  if (!group) return null

  const isConflict = kind === 'conflict'
  const single = group.length === 1
  const isFirst = rowIndex === group[0]
  const isLast = rowIndex === group[group.length - 1]

  if (isConflict) {
    if (single) return 'bg-red-50 ring-2 ring-inset ring-red-600 rounded-sm'
    if (isFirst) return 'bg-red-50 ring-2 ring-inset ring-red-600 rounded-t-md ring-b-0'
    if (isLast) return 'bg-red-50 ring-2 ring-inset ring-red-600 rounded-b-md ring-t-0'
    return 'bg-red-50 ring-x-2 ring-inset ring-red-600 ring-y-0'
  }

  if (single) return 'bg-amber-50 ring-2 ring-inset ring-amber-500 rounded-sm'
  if (isFirst) return 'bg-amber-50 ring-2 ring-inset ring-amber-500 rounded-t-md ring-b-0'
  if (isLast) return 'bg-amber-50 ring-2 ring-inset ring-amber-500 rounded-b-md ring-t-0'
  return 'bg-amber-50 ring-x-2 ring-inset ring-amber-500 ring-y-0'
}

function ScheduleTimetableDrawer({
  open,
  onClose,
  period,
  onPeriodChange,
  anchorDate,
  onAnchorDateChange,
  rows,
  onRowChange,
  onAddTrip,
  onToggleAll,
  buses,
  drivers,
  existingSchedules = [],
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
  const [focusedTripRowIds, setFocusedTripRowIds] = useState([])
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const focusTripRows = useCallback(
    (tripRowIds) => {
      const ids = (Array.isArray(tripRowIds) ? tripRowIds : [tripRowIds])
        .map(String)
        .filter(Boolean)
      if (!ids.length) return
      setFocusedTripRowIds(ids)
      window.requestAnimationFrame(() => {
        const rowEls = ids
          .map((id) => document.getElementById(`timetable-row-${id}`))
          .filter(Boolean)
        rowEls[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (rowEls.length > 1) {
          const last = rowEls[rowEls.length - 1]
          const container = rowEls[0]?.closest('.overflow-auto')
          if (container && last) {
            const firstTop = rowEls[0].offsetTop
            const lastBottom = last.offsetTop + last.offsetHeight
            if (lastBottom - firstTop > container.clientHeight) {
              last.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }
        }
        const focusField =
          rowEls[0]?.querySelector('[data-focus-priority]') ||
          rowEls[0]?.querySelector('select:not([disabled]), input:not([disabled])')
        focusField?.focus({ preventScroll: true })
      })
    },
    []
  )

  useEffect(() => {
    if (!focusedTripRowIds.length) return undefined
    const timer = window.setTimeout(() => setFocusedTripRowIds([]), 4500)
    return () => window.clearTimeout(timer)
  }, [focusedTripRowIds])

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
  const { conflictCards, validationCards } = buildTimetableFeedbackCards(
    rows,
    conflictPreview?.issues || []
  )
  const feedbackCards = [...conflictCards, ...validationCards]

  const hasStatusPanel =
    Boolean(error) || checkingConflicts || feedbackCards.length > 0 || canCreateTimetable

  const issueCount = feedbackCards.length
  const hasConflictIssues = conflictCards.length > 0
  const showIssueBadge = issueCount > 0 || Boolean(error) || checkingConflicts

  const focusedRowIndices = focusedTripRowIds
    .map((id) => rows.findIndex((r) => String(r.tripRowId) === String(id)))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)

  const primaryFocusTripRowId = focusedRowIndices.length
    ? String(rows[focusedRowIndices[0]]?.tripRowId)
    : null

  const anchorExistingTrips = (existingSchedules || []).filter(
    (s) => s.status !== 'cancelled' && tripDateKey(s) === anchorDate
  )

  const feedbackPanel = (
      <aside
        className="flex h-[42vh] min-h-0 w-full shrink-0 flex-col border-t border-outline-variant bg-white shadow-2xl lg:h-full lg:w-[min(24rem,32vw)] lg:border-l lg:border-t-0"
        aria-label="Timetable status and errors"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
                <div className="rounded-xl border border-outline-variant bg-surface-container/40 px-4 py-3 text-sm text-neutral-800">
                  <p className="flex items-center gap-2 font-medium">
                    <Icon name="schedule" size={18} className="animate-pulse text-depot-blue-light" />
                    Checking bus, driver, and route overlaps...
                  </p>
                </div>
              )}

              {!checkingConflicts && feedbackCards.length > 0 && (
                <div className="space-y-3">
                  {conflictCards.length > 0 && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                      {conflictCards.length} scheduling conflict
                      {conflictCards.length !== 1 ? 's' : ''}
                    </p>
                  )}
                  {validationCards.length > 0 && conflictCards.length === 0 && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                      {validationCards.length} route{validationCards.length !== 1 ? 's' : ''} need
                      attention
                    </p>
                  )}
                  {conflictCards.map((card) => (
                    <div
                      key={card.id}
                      className="rounded-lg border border-l-4 border-red-200 border-l-red-600 bg-red-50 px-4 py-3 text-sm shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-red-700">
                            <Icon name="warning" size={16} className="text-red-600" />
                            Schedule conflict
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            focusTripRows(card.involvedTripRowIds || card.involvedRouteIds || [])
                          }
                          className="shrink-0 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                        >
                          Fix conflict
                        </button>
                      </div>
                      <p className="mt-2 rounded-md border border-red-200/80 bg-white/60 px-2.5 py-1.5 text-xs leading-relaxed text-red-800">
                        {card.items[0]?.text}
                      </p>
                    </div>
                  ))}
                  {validationCards.map((card) => (
                    <div
                      key={String(card.routeId)}
                      className="rounded-lg border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50 px-4 py-3 text-sm shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            <Icon name="warning" size={16} className="text-amber-600" />
                            Incomplete
                          </p>
                          <p className="mt-1 font-semibold text-neutral-900">{card.routeLabel}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const match = rows.find(
                              (r) => String(r.routeId) === String(card.routeId)
                            )
                            focusTripRows(match ? [match.tripRowId] : [])
                          }}
                          className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                        >
                          Complete
                        </button>
                      </div>
                      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-neutral-900">
                        {card.items.map((item, i) => (
                          <li
                            key={i}
                            className="rounded-md border border-amber-200/80 bg-white/60 px-2.5 py-1.5 text-amber-900"
                          >
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {!checkingConflicts && canCreateTimetable && (
                <div className="rounded-xl border border-emerald-300/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg">
                  <p className="flex items-center gap-2 font-semibold">
                    <Icon name="check_circle" size={18} />
                    Ready to send for approval
                  </p>
                  <p className="mt-2 leading-relaxed">
                    Trips will appear on the timetable as pending approval. Drivers are notified only
                    after the depot manager approves.
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
      className={`fixed inset-0 z-[100] flex bg-black/30 ${
        feedbackOpen ? 'flex-col-reverse lg:flex-row' : 'flex-col'
      }`}
    >
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col bg-white shadow-2xl ${
          feedbackOpen ? 'h-[58vh] w-full lg:h-full' : 'h-full w-full'
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
                {saving ? 'Sending...' : 'Send for approval'}
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
                    <th className={`${labelClass} pb-2 pr-2`}>Status</th>
                    <th className={`${labelClass} w-24 pb-2`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {rows.map((row, rowIndex) => {
                    const timeErr = row.included
                      ? validateTimeRange(row.departureTime, row.arrivalTime)
                      : null
                    const rowHints = rowConflictHints?.get?.(String(row.tripRowId)) || []
                    const rowStatus = getTimetableRowStatus(row, { overlapHints: rowHints })
                    const missingBus = row.included && !row.busId
                    const missingDriver = row.included && !row.driverId
                    const rowMinCap = defaultMinCapacityForService(row.serviceType)
                    const availabilityTrips = [
                      ...rows.filter(
                        (r) => r.included && String(r.tripRowId) !== String(row.tripRowId)
                      ),
                      ...anchorExistingTrips.filter(
                        (s) => !row.scheduleId || String(s._id) !== String(row.scheduleId)
                      ),
                    ]
                    const availableBuses = buses.filter(
                      (b) =>
                        isBusAssignable(b, row.serviceType, rowMinCap) &&
                        (!row.included ||
                          isResourceFreeForTrip(b._id, 'busId', row, availabilityTrips, {
                            excludeTripRowId: row.tripRowId,
                          }))
                    )
                    const availableDrivers = drivers.filter(
                      (d) =>
                        isDriverAssignable(d, row.departureTime, anchorDate) &&
                        (!row.included ||
                          isResourceFreeForTrip(d._id, 'driverId', row, availabilityTrips, {
                            excludeTripRowId: row.tripRowId,
                          }))
                    )
                    const rowBuses = buses.filter(
                      (b) =>
                        (isBusAssignable(b, row.serviceType, rowMinCap) &&
                          (!row.included ||
                            isResourceFreeForTrip(b._id, 'busId', row, availabilityTrips, {
                              excludeTripRowId: row.tripRowId,
                            }))) ||
                        (row.busId && String(b._id) === String(row.busId))
                    )
                    const rowDrivers = drivers.filter(
                      (d) =>
                        (isDriverAssignable(d, row.departureTime, anchorDate) &&
                          (!row.included ||
                            isResourceFreeForTrip(d._id, 'driverId', row, availabilityTrips, {
                              excludeTripRowId: row.tripRowId,
                            }))) ||
                        (row.driverId && String(d._id) === String(row.driverId))
                    )
                    const isFocused = focusedRowIndices.includes(rowIndex)
                    const isPrimaryFocus = String(row.tripRowId) === primaryFocusTripRowId
                    const focusHighlight = isFocused
                      ? getFocusedRowHighlight(
                          rowIndex,
                          focusedRowIndices,
                          rowStatus === 'conflict' ? 'conflict' : 'incomplete'
                        )
                      : null
                    const focusField =
                      missingBus ? 'bus' : missingDriver ? 'driver' : timeErr ? 'departure' : 'bus'
                    return (
                      <tr
                        id={`timetable-row-${row.tripRowId}`}
                        key={row.tripRowId}
                        className={`transition-colors duration-300 ${
                          focusHighlight ??
                          (rowStatus === 'conflict'
                            ? 'bg-red-50/60'
                            : rowStatus === 'incomplete'
                              ? 'bg-amber-50/60'
                              : '')
                        }`}
                      >
                        <td className="py-3 pr-2 align-top">
                          <input
                            type="checkbox"
                            checked={row.included}
                            onChange={(e) =>
                              onRowChange(row.tripRowId, 'included', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-outline-variant"
                          />
                        </td>
                        <td className="py-3 pr-3 align-top">
                          <p className="font-semibold text-neutral-900">
                            {formatRouteEndpointsLabel(row)}
                          </p>
                          {row.distance != null ? (
                            <p className="text-xs text-on-surface-variant">{row.distance} km</p>
                          ) : null}
                        </td>
                        <td className="py-3 pr-2 align-top">
                          <input
                            type="time"
                            value={row.departureTime}
                            onChange={(e) =>
                              onRowChange(row.tripRowId, 'departureTime', e.target.value)
                            }
                            disabled={!row.included}
                            required={row.included}
                            data-field="departure"
                            {...(isPrimaryFocus && focusField === 'departure' ? { 'data-focus-priority': true } : {})}
                            className={`${inputClass} time-field`}
                          />
                        </td>
                        <td className="py-3 pr-2 align-top">
                          <input
                            type="time"
                            value={row.arrivalTime}
                            onChange={(e) =>
                              onRowChange(row.tripRowId, 'arrivalTime', e.target.value)
                            }
                            disabled={!row.included}
                            required={row.included}
                            className={`${inputClass} time-field`}
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
                              onRowChange(row.tripRowId, 'busId', e.target.value)
                            }
                            disabled={!row.included}
                            required={row.included}
                            data-field="bus"
                            {...(isPrimaryFocus && focusField === 'bus' ? { 'data-focus-priority': true } : {})}
                            className={`${inputClass}${missingBus ? ' border-red-400' : ''}`}
                          >
                            <option value="">Select bus</option>
                            {rowBuses.map((b) => {
                              const busFree =
                                !row.included ||
                                isResourceFreeForTrip(b._id, 'busId', row, availabilityTrips, {
                                  excludeTripRowId: row.tripRowId,
                                })
                              const nextAvail = busFree
                                ? null
                                : getResourceNextAvailableTime(b._id, 'busId', availabilityTrips)
                              const busyHint = nextAvail ? ` · from ${nextAvail}` : ''
                              return (
                                <option key={b._id} value={b._id}>
                                  {b.regNumber}
                                  {busyHint}
                                </option>
                              )
                            })}
                            {row.included && availableBuses.length === 0 && !row.busId && (
                              <option disabled value="__no_bus__">
                                No bus is available
                              </option>
                            )}
                          </select>
                        </td>
                        <td className="py-3 align-top">
                          <select
                            value={row.driverId}
                            onChange={(e) =>
                              onRowChange(row.tripRowId, 'driverId', e.target.value)
                            }
                            disabled={!row.included}
                            required={row.included}
                            data-field="driver"
                            {...(isPrimaryFocus && focusField === 'driver' ? { 'data-focus-priority': true } : {})}
                            className={`${inputClass}${missingDriver ? ' border-red-400' : ''}`}
                          >
                            <option value="">Select driver</option>
                            {rowDrivers.map((d) => {
                              const driverFree =
                                !row.included ||
                                isResourceFreeForTrip(d._id, 'driverId', row, availabilityTrips, {
                                  excludeTripRowId: row.tripRowId,
                                })
                              const nextAvail = driverFree
                                ? null
                                : getResourceNextAvailableTime(d._id, 'driverId', availabilityTrips)
                              const busyHint = nextAvail ? ` · from ${nextAvail}` : ''
                              return (
                                <option key={d._id} value={d._id}>
                                  {d.name}
                                  {busyHint}
                                </option>
                              )
                            })}
                            {row.included && availableDrivers.length === 0 && !row.driverId && (
                              <option disabled value="__no_driver__">
                                No driver is available
                              </option>
                            )}
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
                        <td className="py-3 align-top">
                          {onAddTrip ? (
                            <button
                              type="button"
                              onClick={() => onAddTrip(row.routeId)}
                              className="flex items-center gap-1 rounded-md border border-outline-variant px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-surface-container"
                              title="Add another trip on this route"
                            >
                              <Icon name="add" size={14} />
                              Add trip
                            </button>
                          ) : null}
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

      {feedbackOpen && feedbackPanel}
    </div>
  )
}

export default ScheduleTimetableDrawer
