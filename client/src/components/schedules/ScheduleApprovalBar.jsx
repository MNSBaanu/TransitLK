import Icon from '../Icon'
import { scheduleCode } from '../../utils/scheduleHelpers'

function ScheduleApprovalBar({ pending, saving, onApprove, onReject, canApprove }) {
  if (!pending?.length || !canApprove) return null

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Icon name="pending_actions" size={20} />
        {pending.length} schedule(s) awaiting approval
      </p>
      <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
        {pending.map((trip) => (
          <li
            key={trip._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm"
          >
            <span className="font-medium text-neutral-900">{scheduleCode(trip)}</span>
            <span className="text-xs text-on-surface-variant">
              {trip.routeId?.routeName} · {trip.departureTime}–{trip.arrivalTime}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => onApprove(trip._id)}
                className="rounded-lg bg-green-600 px-3 py-1 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => onReject(trip._id)}
                className="rounded-lg border border-red-300 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ScheduleApprovalBar
