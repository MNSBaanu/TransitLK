import Icon from '../Icon'
import ScheduleTripLocationPanel from './ScheduleTripLocationPanel'
import {
  ADJUSTMENT_REASON_LABELS,
  displayTripNote,
  formatAdjustmentChange,
  isDriverReportedIssue,
  getDriverIssueNotes,
  getDriverIssueReportedAt,
  formatRouteStopsLabel,
  formatScheduleStatusLabel,
  formatTimeRange,
  formatTripDate,
  getResourceBusyEndTime,
  scheduleCode,
  scheduleStatusClass,
  tripDateKey,
} from '../../utils/scheduleHelpers'

const labelClass = 'text-[10px] font-bold uppercase tracking-wide text-on-surface-variant'
const sectionClass = 'border border-outline-variant bg-surface-container/40'
const panelClass = 'flex h-full flex-col overflow-hidden rounded-none bg-white'

function ScheduleTripDetails({
  selected,
  onClose,
  onAdjust,
  canAdjustSchedules = false,
  canApproveSchedules = false,
  onApprove,
  onReject,
  saving = false,
}) {
  if (!selected) {
    return (
      <div className={panelClass}>
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-5 py-4">
          <h3 className="text-headline text-xl">Trip details</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
            aria-label="Close panel"
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm text-on-surface-variant">Select a trip on the timetable to view details.</p>
        </div>
      </div>
    )
  }

  const driverIssue = isDriverReportedIssue(selected)

  return (
    <div className={panelClass}>
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-5 py-4">
        <div>
          <h3 className="text-headline text-xl">Trip details</h3>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {scheduleCode(selected)} · {formatTripDate(tripDateKey(selected))}
          </p>
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

      <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4">
        {driverIssue && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900">
              <Icon name="report_problem" size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-950">Driver reported an issue</p>
              <p className="mt-1 text-sm text-amber-900/90">
                {getDriverIssueNotes(selected) || 'No details provided.'}
              </p>
              {getDriverIssueReportedAt(selected) ? (
                <p className="mt-1 text-xs text-amber-800/80">
                  Reported {new Date(getDriverIssueReportedAt(selected)).toLocaleString('en-GB')}
                </p>
              ) : null}
            </div>
          </div>
        )}
        <div className={`${sectionClass} p-4`}>
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
          {displayTripNote(selected.adjustmentNotes) ? (
            <p className="mt-2 text-xs text-on-surface-variant">
              <span className="font-semibold">Note: </span>
              {displayTripNote(selected.adjustmentNotes)}
            </p>
          ) : null}
        </div>

        <ScheduleTripLocationPanel trip={selected} />

        {Array.isArray(selected.adjustmentHistory) && selected.adjustmentHistory.length > 0 && (
          <div className={`mt-4 ${sectionClass} p-4`}>
            <p className={`${labelClass} mb-2`}>Adjustment history</p>
            <ul className="max-h-48 space-y-2 overflow-y-auto text-xs text-on-surface-variant">
              {[...selected.adjustmentHistory].reverse().slice(0, 8).map((entry, i) => (
                <li key={entry._id || i} className="rounded-md border border-outline-variant/60 bg-white px-3 py-2">
                  <p className="font-semibold text-neutral-900">
                    {ADJUSTMENT_REASON_LABELS[entry.reason] || entry.reason}
                    <span className="ml-1 font-normal text-on-surface-variant">
                      · {entry.at ? new Date(entry.at).toLocaleString('en-GB') : ''}
                      {entry.by?.name ? ` · ${entry.by.name}` : ''}
                    </span>
                  </p>
                  {displayTripNote(entry.notes) ? (
                    <p className="mt-0.5">{displayTripNote(entry.notes)}</p>
                  ) : null}
                  {(entry.changes || []).map((ch, ci) => (
                    <p key={ci} className="mt-0.5">
                      {formatAdjustmentChange(ch)}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-outline-variant bg-white px-5 py-4">
        {canApproveSchedules && selected.status === 'pending' && (
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
        {canAdjustSchedules && (
          <button type="button" onClick={onAdjust} className="btn-primary flex w-full items-center justify-center gap-2 py-3">
            <Icon name="tune" size={18} />
            Adjust this trip
          </button>
        )}
        <button type="button" onClick={onClose} className="btn-outlined w-full py-2.5">
          Close
        </button>
      </div>
    </div>
  )
}

export default ScheduleTripDetails
