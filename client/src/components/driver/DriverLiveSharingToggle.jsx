import Icon from '../Icon'
import { formatLiveLocationAge } from '../../utils/liveLocationHelpers'

function DriverLiveSharingToggle({
  trip,
  sharingBusy,
  onToggle,
  compact = false,
}) {
  const enabled = Boolean(trip.liveLocationSharing)
  const updatedAt = trip.liveLocation?.updatedAt

  return (
    <div
      className={`rounded-xl border ${
        enabled ? 'border-green-300 bg-green-50' : 'border-outline-variant bg-surface-container/30'
      } ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
            <Icon name="my_location" size={16} className={enabled ? 'text-green-700' : ''} />
            Live location sharing
          </p>
          {!compact && (
            <p className="mt-1 text-xs text-on-surface-variant">
              Share your GPS with depot managers while this trip is active.
            </p>
          )}
          {enabled && updatedAt ? (
            <p className="mt-1 text-[11px] font-medium text-green-800">
              Sharing · updated {formatLiveLocationAge(updatedAt)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={sharingBusy}
          onClick={() => onToggle(trip._id, !enabled)}
          aria-pressed={enabled}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? 'bg-green-600' : 'bg-neutral-300'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

export default DriverLiveSharingToggle
