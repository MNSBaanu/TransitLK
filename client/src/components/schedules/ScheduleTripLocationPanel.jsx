import { useEffect, useState } from 'react'
import api from '../../services/api'
import RouteMap from '../RouteMap'
import Icon from '../Icon'
import { formatLiveLocationAge, isLiveTrackingEligible } from '../../utils/liveLocationHelpers'

const POLL_MS = 12000

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

function ScheduleTripLocationPanel({ trip }) {
  const [liveTrip, setLiveTrip] = useState(trip)

  useEffect(() => {
    setLiveTrip(trip)
  }, [trip])

  const shouldPoll = Boolean(trip?._id && isLiveTrackingEligible(trip?.status))

  useEffect(() => {
    if (!shouldPoll || !trip?._id) return undefined

    const load = () => {
      api
        .get(`/schedules/${trip._id}`)
        .then(({ data }) => setLiveTrip(data))
        .catch(() => {})
    }

    load()
    const timer = window.setInterval(load, POLL_MS)
    return () => window.clearInterval(timer)
  }, [trip?._id, shouldPoll])

  if (!liveTrip) return null

  const route = liveTrip.routeId || {}
  const mapProps = routeMapProps(route)
  const hasRouteMap = Boolean(mapProps.startPoint?.trim() && mapProps.endPoint?.trim())
  const isSharing = Boolean(liveTrip.liveLocationSharing && liveTrip.liveLocation?.lat != null)
  const driverName = liveTrip.driverId?.name || 'Driver'

  return (
    <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container/30 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <Icon name="map" size={18} className="text-depot-blue-light" />
            Trip location
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Planned route and driver live GPS when sharing is enabled.
          </p>
        </div>
        {isSharing ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase text-green-800">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600" />
            Live sharing
          </span>
        ) : isLiveTrackingEligible(liveTrip.status) ? (
          <span className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold uppercase text-on-surface-variant">
            Awaiting driver GPS
          </span>
        ) : null}
      </div>

      {isSharing ? (
        <p className="mb-3 text-xs text-green-800">
          {driverName} · updated {formatLiveLocationAge(liveTrip.liveLocation.updatedAt)} ·{' '}
          {Number(liveTrip.liveLocation.lat).toFixed(5)},{' '}
          {Number(liveTrip.liveLocation.lng).toFixed(5)}
        </p>
      ) : isLiveTrackingEligible(liveTrip.status) ? (
        <p className="mb-3 text-xs text-on-surface-variant">
          Trip is active. Live position appears here when the driver turns on location sharing.
        </p>
      ) : (
        <p className="mb-3 text-xs text-on-surface-variant">
          Live location is available after the driver starts this trip.
        </p>
      )}

      <div className="relative min-h-[220px] overflow-hidden rounded-xl border border-outline-variant bg-white">
        {hasRouteMap ? (
          <RouteMap
            {...mapProps}
            liveLocation={isSharing ? liveTrip.liveLocation : null}
            liveLocationLabel={driverName}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <Icon name="map" size={40} className="mb-2 text-on-surface-variant/40" />
            <p className="text-sm font-medium text-neutral-900">Route map unavailable</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              This route does not have start and end points configured.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScheduleTripLocationPanel
