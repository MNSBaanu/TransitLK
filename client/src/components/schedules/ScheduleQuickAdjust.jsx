import { useEffect, useMemo, useState } from 'react'
import Icon from '../Icon'
import {
  defaultMinCapacityForService,
  formatServiceType,
  isBusAssignable,
  isDriverAssignable,
} from '../../utils/fleetHelpers'
import {
  ADJUSTMENT_REASON_LABELS,
  formatAdjustmentChange,
  formatRouteStopsLabel,
  formatTimeRange,
  formatTripDate,
  formatScheduleStatusLabel,
  getResourceBusyEndTime,
  reasonToStatus,
  scheduleStatusClass,
  requiresAdjustmentNotes,
  scheduleCode,
  tripDateKey,
  validateTimeRange,
} from '../../utils/scheduleHelpers'

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-50'
const labelClass = 'text-[10px] font-bold uppercase tracking-wide text-on-surface-variant'
const sectionClass = 'border border-outline-variant bg-surface-container/40'
const panelClass = 'flex h-full flex-col overflow-hidden rounded-none bg-white'

const defaultAdjust = {
  departureTime: '08:00',
  arrivalTime: '12:00',
  busId: '',
  driverId: '',
  status: 'scheduled',
  reason: 'normal',
  notes: '',
}

function ScheduleQuickAdjust({
  selected,
  emergencyMode,
  onEmergencyToggle,
  adjustForm,
  onAdjustChange,
  drivers,
  buses,
  allBuses = [],
  conflicts,
  showConflictPanel,
  onToggleConflictPanel,
  onClose,
  saving,
  error,
  onApply,
  onCancelTrip,
  onSubmitDraft,
  canSubmitDraft,
  canApproveSchedules = false,
  onApprove,
  onReject,
  adjustConflict,
  onPickMaintenanceBus,
  onMaintenanceOffline,
  onPickCoverDriver,
  canAdjustSchedules = true,
}) {
  const form = adjustForm || defaultAdjust
  const timeErr = selected ? validateTimeRange(form.departureTime, form.arrivalTime) : null
  const derivedStatus = reasonToStatus(form.reason, form.status)
  const [activePicker, setActivePicker] = useState(null)
  const tripDepartureTime = form.departureTime || selected?.departureTime

  const assignableDrivers = useMemo(
    () =>
      drivers.filter(
        (d) =>
          isDriverAssignable(d, tripDepartureTime) ||
          String(d._id) === String(form.driverId || selected?.driverId?._id || selected?.driverId)
      ),
    [drivers, form.driverId, selected, tripDepartureTime]
  )

  const eligibleDrivers = useMemo(
    () => drivers.filter((d) => isDriverAssignable(d, tripDepartureTime)),
    [drivers, tripDepartureTime]
  )

  const assignableBuses = useMemo(() => {
    if (!selected) return []
    const serviceType = selected.routeId?.serviceType
    const minCap = defaultMinCapacityForService(serviceType)
    const currentBusId = String(form.busId || selected?.busId?._id || selected?.busId || '')
    return buses.filter(
      (b) => isBusAssignable(b, serviceType, minCap) || String(b._id) === currentBusId
    )
  }, [selected, buses, form.busId])

  const eligibleBuses = useMemo(() => {
    if (!selected) return []
    const serviceType = selected.routeId?.serviceType
    const minCap = defaultMinCapacityForService(serviceType)
    return buses.filter((b) => isBusAssignable(b, serviceType, minCap))
  }, [selected, buses])

  const maintenanceSwapOptions = useMemo(() => {
    if (!selected) return []
    const currentBusId = String(selected.busId?._id || selected.busId || '')
    const serviceType = selected.routeId?.serviceType
    const minCap = defaultMinCapacityForService(serviceType)
    const pool = allBuses.length ? allBuses : buses
    return pool.filter(
      (b) => String(b._id) !== currentBusId && isBusAssignable(b, serviceType, minCap)
    )
  }, [selected, allBuses, buses])

  const coverDriverOptions = useMemo(() => {
    if (!selected) return []
    const currentDriverId = String(selected.driverId?._id || selected.driverId || '')
    return drivers.filter(
      (d) =>
        String(d._id) !== currentDriverId && isDriverAssignable(d, tripDepartureTime)
    )
  }, [selected, drivers, tripDepartureTime])

  const togglePicker = (picker) => {
    setActivePicker((prev) => (prev === picker ? null : picker))
  }

  useEffect(() => {
    setActivePicker(null)
  }, [selected?._id])

  if (showConflictPanel) {
    return (
      <div className={panelClass}>
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-5 py-4">
          <h3 className="flex items-center gap-2 text-headline text-lg text-red-700">
            <Icon name="report_problem" size={22} />
            Conflict details
          </h3>
          <button
            type="button"
            onClick={onToggleConflictPanel}
            className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
            aria-label="Close conflict panel"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white p-5">
          {conflicts.length === 0 ? (
            <div className={`${sectionClass} px-4 py-8 text-center text-sm text-on-surface-variant`}>
              No conflicts in this period.
            </div>
          ) : (
            conflicts.map((c, i) => (
              <div
                key={i}
                className="border border-l-4 border-red-200 border-l-red-600 bg-red-50 px-4 py-3 text-sm"
              >
                <p className={`${labelClass} mb-1 text-red-700`}>
                  {c.type === 'bus'
                    ? 'Vehicle conflict'
                    : c.type === 'driver'
                      ? 'Driver conflict'
                      : c.type === 'route'
                        ? 'Route conflict'
                        : 'Scheduling conflict'}
                </p>
                <p className="leading-relaxed text-neutral-900">{c.message}</p>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-outline-variant bg-white px-5 py-4">
          <button type="button" onClick={onToggleConflictPanel} className="btn-primary w-full">
            Back to adjust form
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={panelClass}>
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-5 py-4">
        <div>
          <h3 className="text-headline text-xl">
            {selected ? 'Trip details' : 'Adjust schedule'}
          </h3>
          {selected ? (
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {scheduleCode(selected)} · {formatTripDate(tripDateKey(selected))}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Pick a trip on the timetable — the form opens when you select one
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
          aria-label="Close panel"
        >
          <Icon name="close" size={22} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-5 py-4">
        {canAdjustSchedules && (
          <div className={`mb-4 flex items-center justify-between ${sectionClass} px-3 py-2.5`}>
            <div className="flex items-center gap-2">
              <Icon name="emergency_home" size={20} className="text-depot-blue-light" />
              <span className={`${labelClass} text-depot-blue-light`}>Emergency priority</span>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={emergencyMode}
                onChange={(e) => onEmergencyToggle(e.target.checked)}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-[#d1d5db] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-outline-variant after:bg-white after:transition-all peer-checked:bg-depot-blue-light peer-checked:after:translate-x-full" />
            </label>
          </div>
        )}

        {!selected ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-depot-blue-light/10 text-depot-blue-light">
                <Icon name="touch_app" size={32} />
              </div>
              <p className="text-base font-semibold text-neutral-900">Select a trip to adjust</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-on-surface-variant">
                Click any trip in the daily, weekly, or monthly timetable. You can then change times,
                reassign the bus or driver, and save.
              </p>
              {conflicts.length > 0 && (
                <button
                  type="button"
                  onClick={onToggleConflictPanel}
                  className="btn-outlined mt-6 flex items-center gap-2"
                >
                  <Icon name="warning" size={18} className="text-red-600" />
                  View {conflicts.length} scheduling conflict{conflicts.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
          <div className={`${sectionClass} mb-4 p-4`}>
            <p className={`${labelClass} mb-2`}>Trip overview</p>
            {selected.routeId && (
              <div className="mb-3 border-b border-outline-variant/60 pb-3">
                <p className="text-sm font-semibold text-neutral-900">
                  {selected.routeId.routeName || 'Route'}
                </p>
                {selected.routeId.startPoint && selected.routeId.endPoint ? (
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {selected.routeId.startPoint} → {selected.routeId.endPoint}
                    {selected.routeId.distance != null ? ` · ${selected.routeId.distance} km` : ''}
                  </p>
                ) : null}
                {formatRouteStopsLabel(selected.routeId) ? (
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    Stops: {formatRouteStopsLabel(selected.routeId)}
                  </p>
                ) : null}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className={labelClass}>Trip date</span>
                <p className="mt-1 font-semibold text-neutral-900">
                  {formatTripDate(tripDateKey(selected))}
                </p>
              </div>
              <div>
                <span className={labelClass}>Outbound window</span>
                <p className="mt-1 font-semibold tabular-nums text-neutral-900">
                  {formatTimeRange(selected.departureTime, selected.arrivalTime)}
                </p>
              </div>
              <div>
                <span className={labelClass}>Busy until (return)</span>
                <p className="mt-1 font-semibold tabular-nums text-neutral-900">
                  {getResourceBusyEndTime(selected.departureTime, selected.arrivalTime) || '—'}
                </p>
              </div>
              <div>
                <span className={labelClass}>Service type</span>
                <p className="mt-1 font-semibold capitalize text-neutral-900">
                  {selected.routeId?.serviceType || '—'}
                </p>
              </div>
              <div>
                <span className={labelClass}>Vehicle</span>
                <p className="mt-1 font-semibold text-neutral-900">
                  {selected.busId?.regNumber || '—'}
                </p>
              </div>
              <div>
                <span className={labelClass}>Driver</span>
                <p className="mt-1 font-semibold text-neutral-900">
                  {selected.driverId?.name || '—'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${scheduleStatusClass(selected.status)}`}
              >
                {formatScheduleStatusLabel(selected.status)}
              </span>
              {selected.adjustmentReason && selected.adjustmentReason !== 'normal' && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                  {ADJUSTMENT_REASON_LABELS[selected.adjustmentReason] || selected.adjustmentReason}
                </span>
              )}
            </div>
            {selected.adjustmentNotes && (
              <p className="mt-2 text-xs text-on-surface-variant">
                <span className="font-semibold">Last note: </span>
                {selected.adjustmentNotes}
              </p>
            )}
            {Array.isArray(selected.adjustmentHistory) && selected.adjustmentHistory.length > 0 && (
              <div className="mt-3 border-t border-outline-variant/60 pt-3">
                <p className={`${labelClass} mb-2`}>Recent changes</p>
                <ul className="max-h-28 space-y-1.5 overflow-y-auto text-xs text-on-surface-variant">
                  {selected.adjustmentHistory
                    .slice(-3)
                    .reverse()
                    .map((entry, i) => (
                      <li key={entry._id || i} className="rounded-md bg-white/80 px-2 py-1.5">
                        {(entry.changes || []).map(formatAdjustmentChange).filter(Boolean).join(' · ') ||
                          entry.notes ||
                          'Adjustment recorded'}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

        {error && (
          <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {canAdjustSchedules ? (
        <>
        <div className="space-y-5">
          <section className={`${sectionClass} p-4`}>
            <span className={`${labelClass} mb-3 block`}>Adjust timing</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Departure</span>
                <input
                  name="departureTime"
                  type="time"
                  value={form.departureTime}
                  onChange={onAdjustChange}
                  disabled={!selected}
                  className={`${inputClass} time-field mt-1`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Arrival</span>
                <input
                  name="arrivalTime"
                  type="time"
                  value={form.arrivalTime}
                  onChange={onAdjustChange}
                  disabled={!selected}
                  className={`${inputClass} time-field mt-1`}
                />
              </label>
            </div>
            {selected && (
              <p className="mt-2 text-xs text-on-surface-variant">
                {timeErr ? (
                  <span className="font-medium text-red-600">{timeErr}</span>
                ) : (
                  <>
                    New window:{' '}
                    <span className="font-semibold tabular-nums text-neutral-900">
                      {formatTimeRange(form.departureTime, form.arrivalTime)}
                    </span>
                  </>
                )}
              </p>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={`${labelClass} mb-1 block`}>Reassign driver</span>
              <select
                name="driverId"
                value={form.driverId}
                onChange={onAdjustChange}
                disabled={!selected}
                className={inputClass}
              >
                <option value="">Select driver</option>
                {assignableDrivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
                {selected && eligibleDrivers.length === 0 && !form.driverId && (
                  <option disabled value="__no_driver__">
                    No driver is available
                  </option>
                )}
              </select>
              {selected && eligibleDrivers.length === 0 && !form.driverId && (
                <p className="mt-1 text-xs text-amber-800">No driver is available right now.</p>
              )}
            </label>

            <label className="block">
              <span className={`${labelClass} mb-1 block`}>Swap vehicle</span>
              <select
                name="busId"
                value={form.busId}
                onChange={onAdjustChange}
                disabled={!selected}
                className={inputClass}
              >
                <option value="">Select vehicle</option>
                {assignableBuses.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.regNumber}
                    {b.serviceType ? ` · ${b.serviceType}` : ''}
                  </option>
                ))}
                {selected && eligibleBuses.length === 0 && !form.busId && (
                  <option disabled value="__no_bus__">
                    No bus is available
                  </option>
                )}
              </select>
              {selected && eligibleBuses.length === 0 && !form.busId && (
                <p className="mt-1 text-xs text-amber-800">
                  No {formatServiceType(selected.routeId?.serviceType)} bus is available right now.
                </p>
              )}
            </label>
          </section>

          <section className={`${sectionClass} p-4`}>
            <label className="block">
              <span className={`${labelClass} mb-1 block`}>Reason for adjustment</span>
              <select
                name="reason"
                value={form.reason}
                onChange={onAdjustChange}
                disabled={!selected}
                className={`${inputClass} mb-3`}
              >
                <option value="normal">Normal adjustment</option>
                <option value="emergency">Emergency / unexpected event</option>
                <option value="maintenance">Vehicle maintenance</option>
                <option value="absence">Driver absence</option>
                <option value="obstruction">Route obstruction</option>
              </select>
              <textarea
                name="notes"
                value={form.notes || ''}
                onChange={onAdjustChange}
                disabled={!selected}
                rows={4}
                placeholder={
                  requiresAdjustmentNotes(form.reason)
                    ? 'Required: describe the emergency, maintenance, absence, or obstruction...'
                    : 'Optional notes for depot log...'
                }
                className={`${inputClass} resize-none ${
                  requiresAdjustmentNotes(form.reason) && !form.notes?.trim()
                    ? 'border-amber-400'
                    : ''
                }`}
              />
              {requiresAdjustmentNotes(form.reason) && (
                <p className="mt-1 text-xs text-amber-800">Notes required for this adjustment type</p>
              )}
            </label>

            <label className="mt-4 block">
              <span className={`${labelClass} mb-1 block`}>Trip status after save</span>
              <select
                name="status"
                value={form.status}
                onChange={onAdjustChange}
                disabled={!selected}
                className={inputClass}
              >
                <option value="scheduled">Scheduled</option>
                <option value="on-time">On time</option>
                <option value="delayed">Delayed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending approval</option>
              </select>
              {selected && derivedStatus !== form.status && form.reason !== 'normal' && (
                <p className="mt-1 text-xs text-on-surface-variant">
                  Saving with reason &ldquo;{ADJUSTMENT_REASON_LABELS[form.reason] || form.reason}
                  &rdquo; will set status to{' '}
                  <span className="font-semibold capitalize text-neutral-900">{derivedStatus}</span>
                </p>
              )}
            </label>
          </section>
        </div>

        {selected?.adjustmentHistory?.length > 0 && (
          <div className="mt-5 border-t border-outline-variant pt-5">
            <span className={`${labelClass} mb-2 block`}>Adjustment history</span>
            <div className={`max-h-40 space-y-2 overflow-y-auto ${sectionClass} p-2`}>
              {[...selected.adjustmentHistory].reverse().slice(0, 6).map((entry, i) => (
                <div key={i} className="border border-outline-variant/60 bg-white p-2.5 text-[11px]">
                  <p className="font-semibold text-neutral-900">
                    {ADJUSTMENT_REASON_LABELS[entry.reason] || entry.reason}
                    <span className="ml-1 font-normal text-on-surface-variant">
                      · {entry.at ? new Date(entry.at).toLocaleString('en-GB') : ''}
                      {entry.by?.name ? ` · ${entry.by.name}` : ''}
                    </span>
                  </p>
                  {entry.notes && <p className="text-on-surface-variant">{entry.notes}</p>}
                  {(entry.changes || []).slice(0, 3).map((ch, ci) => (
                    <p key={ci} className="text-on-surface-variant">
                      {formatAdjustmentChange(ch)}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {adjustConflict?.hasConflict && (
          <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
              <Icon name="warning" size={16} />
              Conflict check — resolve before saving
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5">
              {(adjustConflict.conflicts || []).map((c, i) => (
                <li key={i}>{c.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 space-y-2 pb-2">
          {canApproveSchedules && selected?.status === 'pending' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onApprove?.(selected._id)}
                disabled={saving}
                className="rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Approve trip
              </button>
              <button
                type="button"
                onClick={() => onReject?.(selected._id)}
                disabled={saving}
                className="rounded-lg border border-red-300 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject trip
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onApply}
            disabled={
              saving ||
              !selected ||
              Boolean(timeErr) ||
              adjustConflict?.hasConflict ||
              (requiresAdjustmentNotes(form.reason) && !form.notes?.trim())
            }
            className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Apply changes'}
          </button>
          {canSubmitDraft && selected?.status === 'draft' && (
            <button
              type="button"
              onClick={onSubmitDraft}
              disabled={!selected || saving || adjustConflict?.hasConflict}
              className="btn-outlined flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="send" size={18} />
              Submit for approval
            </button>
          )}
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => togglePicker('bus')}
                disabled={!selected || saving}
                className={`btn-outlined flex items-center justify-center gap-2 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                  activePicker === 'bus' ? 'ring-2 ring-depot-blue-light/40' : ''
                }`}
              >
                <Icon name="swap_horiz" size={18} />
                Choose replacement vehicle
              </button>
              <button
                type="button"
                onClick={() => togglePicker('driver')}
                disabled={!selected || saving}
                className={`btn-outlined flex items-center justify-center gap-2 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                  activePicker === 'driver' ? 'ring-2 ring-depot-blue-light/40' : ''
                }`}
              >
                <Icon name="person_add" size={18} />
                Choose cover driver
              </button>
            </div>

            {activePicker === 'bus' && selected && (
              <div className={`${sectionClass} p-3`}>
                <p className={`${labelClass} mb-2`}>Available vehicles for this route</p>
                {maintenanceSwapOptions.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    No available vehicles match this route&apos;s service type and capacity.
                  </p>
                ) : (
                  <ul className="max-h-44 space-y-1.5 overflow-y-auto">
                    {maintenanceSwapOptions.map((bus) => (
                      <li key={bus._id}>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            onPickMaintenanceBus?.(bus)
                            setActivePicker(null)
                          }}
                          className="flex w-full items-center justify-between gap-2 border border-outline-variant bg-white px-3 py-2 text-left text-xs transition-colors hover:border-depot-blue-light hover:bg-depot-blue-light/5"
                        >
                          <span className="font-semibold text-neutral-900">{bus.regNumber}</span>
                          <span className="text-on-surface-variant">
                            {bus.capacity ? `${bus.capacity} seats` : ''}
                            {bus.serviceType ? ` · ${formatServiceType(bus.serviceType)}` : ''}
                          </span>
                          <span className="shrink-0 text-[10px] font-bold uppercase text-emerald-700">
                            {formatServiceType(bus.status || 'available')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-on-surface-variant">
                  Select a vehicle, then review the form and click Apply changes.
                </p>
              </div>
            )}

            {activePicker === 'driver' && selected && (
              <div className={`${sectionClass} p-3`}>
                <p className={`${labelClass} mb-2`}>Available cover drivers</p>
                {coverDriverOptions.length === 0 ? (
                  <p className="text-xs text-amber-800">No driver is available.</p>
                ) : (
                  <ul className="max-h-44 space-y-1.5 overflow-y-auto">
                    {coverDriverOptions.map((driver) => (
                      <li key={driver._id}>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            onPickCoverDriver?.(driver)
                            setActivePicker(null)
                          }}
                          className="flex w-full items-center justify-between gap-2 border border-outline-variant bg-white px-3 py-2 text-left text-xs transition-colors hover:border-depot-blue-light hover:bg-depot-blue-light/5"
                        >
                          <span className="font-semibold text-neutral-900">{driver.name}</span>
                          <span className="shrink-0 text-[10px] font-bold uppercase text-emerald-700">
                            {formatServiceType(driver.status || 'available')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-on-surface-variant">
                  Pick an available driver, then review and click Apply changes.
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onCancelTrip}
            disabled={!selected || saving || selected?.status === 'cancelled'}
            className="btn-outlined flex w-full items-center justify-center gap-2 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="cancel" size={18} />
            Cancel trip
          </button>
          <button
            type="button"
            onClick={onMaintenanceOffline}
            disabled={!selected || saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-depot-navy px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-depot-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="build" size={18} />
            Immediate maintenance offline
          </button>
        </div>
        </>
        ) : (
          <div className="mt-4 border-t border-outline-variant pt-4">
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Close
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}

export default ScheduleQuickAdjust
