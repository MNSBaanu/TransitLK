import { useState } from 'react'
import RouteMap from '../RouteMap'
import Icon from '../Icon'
import DriverLiveSharingToggle from './DriverLiveSharingToggle'
import { formatLiveLocationAge, isLiveTrackingEligible } from '../../utils/liveLocationHelpers'
import {
  canDriverAcknowledgeTrip,
  canDriverCompleteTrip,
  canDriverReportIssue,
  formatRouteEndpointsLabel,
  formatRouteStopsLabel,
  formatScheduleStatusLabel,
  formatTripDate,
  scheduleStatusClass,
} from '../../utils/scheduleHelpers'

function routeMapProps(route = {}) {
  return {
    startPoint: route.startPoint,
    endPoint: route.endPoint,
    stops: Array.isArray(route.stops) ? route.stops : [],
    startLocation: route.startLocation || null,
    endLocation: route.endLocation || null,
    stopLocations: Array.isArray(route.stopLocations) ? route.stopLocations : [],
  }
}

function DriverTripCard({
  trip,
  isSaving,
  sharingBusy,
  onSharingToggle,
  onAcknowledge,
  onReportIssue,
  onComplete,
}) {
  const [locationOpen, setLocationOpen] = useState(isLiveTrackingEligible(trip.status))
  const route = trip.routeId || {}
  const mapProps = routeMapProps(route)
  const canAcknowledge = canDriverAcknowledgeTrip(trip.status)
  const canReport = canDriverReportIssue(trip.status)
  const canComplete = canDriverCompleteTrip(trip.status)
  const canShareLive = isLiveTrackingEligible(trip.status)
  const hasRouteMap = Boolean(mapProps.startPoint?.trim() && mapProps.endPoint?.trim())

  return (
    <article className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900">
              {formatRouteEndpointsLabel(route) || 'Route'}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">{formatTripDate(trip.tripDate)}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${scheduleStatusClass(trip.status)}`}
          >
            {formatScheduleStatusLabel(trip.status)}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              Departure
            </dt>
            <dd className="font-medium tabular-nums">{trip.departureTime || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              Arrival
            </dt>
            <dd className="font-medium tabular-nums">{trip.arrivalTime || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              Bus
            </dt>
            <dd className="font-medium">{trip.busId?.regNumber || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              Distance
            </dt>
            <dd className="font-medium">{route.distance != null ? `${route.distance} km` : '—'}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canAcknowledge || isSaving}
            onClick={() => onAcknowledge(trip._id)}
            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Start trip'}
          </button>
          <button
            type="button"
            disabled={!canReport || isSaving}
            onClick={() => onReportIssue(trip)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="report_problem" size={14} />
            Report issue
          </button>
          <button
            type="button"
            disabled={!canComplete || isSaving}
            onClick={() => onComplete(trip._id)}
            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mark completed
          </button>
        </div>
      </div>

      <div className="border-t border-outline-variant bg-surface-container/20">
        <button
          type="button"
          onClick={() => setLocationOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-container/40"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <Icon name="map" size={18} className="text-depot-blue-light" />
            Trip location
            {trip.liveLocationSharing ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-800">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600" />
                Live
              </span>
            ) : null}
          </span>
          <Icon name={locationOpen ? 'expand_less' : 'expand_more'} size={22} />
        </button>

        {locationOpen ? (
          <div className="space-y-3 border-t border-outline-variant px-4 pb-4 pt-3">
            {formatRouteStopsLabel(route) ? (
              <p className="text-xs text-on-surface-variant">
                Stops: {formatRouteStopsLabel(route)}
              </p>
            ) : null}

            {canShareLive ? (
              <DriverLiveSharingToggle
                trip={trip}
                sharingBusy={sharingBusy}
                onToggle={onSharingToggle}
                compact
              />
            ) : (
              <p className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs text-on-surface-variant">
                Start the trip to enable live location sharing with depot staff.
              </p>
            )}

            {trip.liveLocationSharing && trip.liveLocation?.updatedAt ? (
              <p className="text-[11px] font-medium text-green-800">
                Last shared {formatLiveLocationAge(trip.liveLocation.updatedAt)}
                {trip.liveLocation.lat != null && trip.liveLocation.lng != null
                  ? ` · ${Number(trip.liveLocation.lat).toFixed(5)}, ${Number(trip.liveLocation.lng).toFixed(5)}`
                  : ''}
              </p>
            ) : null}

            <div className="relative min-h-[240px] overflow-hidden rounded-xl border border-outline-variant bg-white">
              {hasRouteMap ? (
                <RouteMap {...mapProps} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <Icon name="map" size={40} className="mb-2 text-on-surface-variant/40" />
                  <p className="text-sm font-medium text-neutral-900">Route map unavailable</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Start and end points are not configured for this route.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default DriverTripCard
