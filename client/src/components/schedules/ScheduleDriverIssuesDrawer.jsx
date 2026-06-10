import Icon from '../Icon'
import DriverIssueIndicator from './DriverIssueIndicator'
import {
  displayTripNote,
  formatRouteEndpointsLabel,
  formatTripDate,
  getDriverIssueReportedAt,
  tripDateKey,
} from '../../utils/scheduleHelpers'

function ScheduleDriverIssuesDrawer({
  open,
  onClose,
  issues,
  loading,
  onSelectIssue,
  onRefresh,
  refreshing,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10003] flex justify-end bg-black/40">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close issues panel"
      />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-outline-variant bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-900">
              <Icon name="report_problem" size={22} />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Driver issues</h3>
              <p className="text-xs text-on-surface-variant">
                Open reports from drivers — stored on trip schedules (no separate database)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
            aria-label="Close"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container/40 px-5 py-2.5">
          <span className="text-sm font-medium text-neutral-800">
            {issues.length} open issue{issues.length !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            disabled={refreshing}
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-depot-navy hover:bg-white disabled:opacity-50"
          >
            <Icon name="refresh" size={16} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && issues.length === 0 ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">Loading issues…</p>
          ) : issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DriverIssueIndicator size={28} className="!h-14 !w-14" />
              <p className="mt-4 text-sm font-semibold text-neutral-900">No driver issues</p>
              <p className="mt-1 max-w-xs text-sm text-on-surface-variant">
                When a driver reports an issue from My trips, it appears here automatically.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {issues.map((trip) => {
                const reportedAt = getDriverIssueReportedAt(trip)
                return (
                  <li key={trip._id}>
                    <button
                      type="button"
                      onClick={() => onSelectIssue(trip)}
                      className="w-full rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left transition-colors hover:border-amber-300 hover:bg-amber-50"
                    >
                      <div className="flex items-start gap-3">
                        <DriverIssueIndicator size={16} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-neutral-900">
                            {formatRouteEndpointsLabel(trip.routeId) || 'Route'}
                          </p>
                          <p className="mt-0.5 text-xs text-on-surface-variant">
                            {formatTripDate(tripDateKey(trip))} · {trip.departureTime}–
                            {trip.arrivalTime}
                          </p>
                          <p className="mt-1 text-xs font-medium text-neutral-700">
                            {trip.driverId?.name || 'Driver'}
                            {trip.busId?.regNumber ? ` · ${trip.busId.regNumber}` : ''}
                          </p>
                          <p className="mt-2 line-clamp-3 text-sm text-amber-950">
                            {displayTripNote(trip.adjustmentNotes) || 'No details'}
                          </p>
                          {reportedAt ? (
                            <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-amber-800/70">
                              Reported {new Date(reportedAt).toLocaleString('en-GB')}
                            </p>
                          ) : null}
                        </div>
                        <Icon name="chevron_right" size={20} className="shrink-0 text-amber-800/50" />
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScheduleDriverIssuesDrawer
