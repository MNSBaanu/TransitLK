import Icon from '../Icon'
import { scheduleCode } from '../../utils/scheduleHelpers'

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:opacity-50'
const labelClass = 'text-[10px] font-bold uppercase tracking-wide text-on-surface-variant'

const defaultAdjust = {
  departureTime: '08:00',
  arrivalTime: '12:00',
  busId: '',
  driverId: '',
  status: 'scheduled',
  reason: 'normal',
  notes: '',
}

const primaryBtn =
  'w-full rounded-lg bg-depot-blue-light px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-depot-blue-light-hover disabled:opacity-50'
const secondaryBtn =
  'flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-white disabled:opacity-50'
const tertiaryBtn =
  'flex w-full items-center justify-center gap-2 rounded-lg bg-depot-navy px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-depot-navy/90 disabled:opacity-50'

function ScheduleQuickAdjust({
  selected,
  emergencyMode,
  onEmergencyToggle,
  adjustForm,
  onAdjustChange,
  drivers,
  buses,
  conflicts,
  eventLog = [],
  showConflictPanel,
  onToggleConflictPanel,
  onClose,
  saving,
  error,
  onApply,
  onMaintenanceSwap,
  onMaintenanceOffline,
}) {
  const form = adjustForm || defaultAdjust

  if (showConflictPanel) {
    return (
      <div className="flex h-full flex-col overflow-y-auto bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-red-700">
            <Icon name="report_problem" size={20} />
            Conflict details
          </h3>
          <button type="button" onClick={onToggleConflictPanel} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="space-y-4">
          {conflicts.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No conflicts on this day.</p>
          ) : (
            conflicts.map((c, i) => (
              <div
                key={i}
                className="rounded-lg border-l-4 border-red-600 bg-[#f5f5f5] p-3"
              >
                <p className={`${labelClass} mb-1 text-red-700`}>
                  {c.type === 'bus' ? 'Vehicle conflict' : 'Driver conflict'}
                </p>
                <p className="text-sm text-neutral-900">{c.message}</p>
                <button type="button" onClick={onToggleConflictPanel} className={`${secondaryBtn} mt-3`}>
                  Reassign trip
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-5 py-4">
        <h3 className="text-base font-bold text-neutral-900">Quick Adjust</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
          aria-label="Close panel"
        >
          <Icon name="close" size={22} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5">
        <div className="mb-4 flex items-center justify-between rounded-lg border border-depot-blue-light/30 bg-depot-blue-light/5 px-3 py-2.5">
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
            <span className="h-6 w-11 rounded-full bg-[#d1d5db] peer-checked:bg-depot-blue-light after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-outline-variant after:bg-white after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <div className="mb-4 rounded-lg border border-depot-navy/10 bg-depot-navy/5 p-4">
          <p className={`${labelClass} mb-2`}>Selected trip</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium text-on-surface-variant">Vehicle:</span>
              <span className="font-semibold text-neutral-900">
                {selected?.busId?.regNumber || '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="font-medium text-on-surface-variant">Driver:</span>
              <span className="font-semibold text-neutral-900">
                {selected?.driverId?.name || '—'}
              </span>
            </div>
            {selected && (
              <p className="text-xs text-on-surface-variant">
                {scheduleCode(selected)} · {selected.departureTime}–{selected.arrivalTime}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="space-y-4">
          <div>
            <span className={`${labelClass} mb-2 block`}>Adjust timing</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={labelClass}>Departure</span>
                <input
                  name="departureTime"
                  type="time"
                  value={form.departureTime}
                  onChange={onAdjustChange}
                  disabled={!selected}
                  className={`${inputClass} mt-1`}
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
                  className={`${inputClass} mt-1`}
                />
              </label>
            </div>
          </div>

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
              {drivers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
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
              {buses.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.regNumber}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={`${labelClass} mb-1 block`}>Reason for adjustment</span>
            <select
              name="reason"
              value={form.reason}
              onChange={onAdjustChange}
              disabled={!selected}
              className={`${inputClass} mb-2`}
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
              rows={3}
              placeholder="Additional notes for depot log..."
              className={`${inputClass} resize-none`}
            />
          </label>
        </div>

        <div className="mt-4 border-t border-outline-variant pt-4">
          <span className={`${labelClass} mb-2 block`}>Active alerts &amp; event log</span>
          <div className="max-h-32 space-y-2 overflow-y-auto rounded-lg bg-[#eceef1] p-2">
            {eventLog.length === 0 ? (
              <p className="py-4 text-center text-xs text-on-surface-variant">
                No active alerts for this day
              </p>
            ) : (
              eventLog.map((entry, i) => (
                <div
                  key={i}
                  className={`rounded p-2 text-[11px] border-l-2 ${
                    entry.type === 'error'
                      ? 'border-red-600 bg-red-50'
                      : entry.type === 'warning'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-neutral-700 bg-white'
                  }`}
                >
                  <p className="font-bold text-neutral-900">{entry.title}</p>
                  <p className="text-on-surface-variant">{entry.body}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto space-y-2 pt-4">
          <button type="button" onClick={onApply} disabled={saving || !selected} className={primaryBtn}>
            {saving ? 'Saving...' : 'Apply Changes'}
          </button>
          <button
            type="button"
            onClick={onMaintenanceSwap}
            disabled={!selected || saving}
            className={secondaryBtn}
          >
            <Icon name="swap_horiz" size={18} />
            Maintenance Swap Suggestion
          </button>
          <button
            type="button"
            onClick={onMaintenanceOffline}
            disabled={!selected || saving}
            className={tertiaryBtn}
          >
            <Icon name="build" size={18} />
            Immediate Maintenance Offline
          </button>
        </div>
      </div>
    </div>
  )
}

export default ScheduleQuickAdjust
