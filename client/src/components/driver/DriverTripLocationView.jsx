import RouteMap from '../RouteMap'
import Icon from '../Icon'
import {
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

function DriverTripLocationView({ trips, selectedTripId, onSelectTrip }) {
  const selected =
    trips.find((trip) => String(trip._id) === String(selectedTripId)) || trips[0] || null
  const route = selected?.routeId || {}
  const mapProps = routeMapProps(route)

  if (!selected) {
    return (
      <p className="p-8 text-center text-on-surface-variant">
        Select a trip to view its route on the map.
      </p>
    )
  }

  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(280px,320px)_1fr]">
      <div className="max-h-[420px] overflow-y-auto border-b border-outline-variant p-3 lg:max-h-none lg:border-b-0 lg:border-r">
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          Assigned trips
        </p>
        <ul className="space-y-2">
          {trips.map((trip) => {
            const isActive = String(trip._id) === String(selected._id)
            return (
              <li key={trip._id}>
                <button
                  type="button"
                  onClick={() => onSelectTrip(trip._id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    isActive
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                      : 'border-outline-variant bg-white hover:border-neutral-400 hover:bg-surface-container/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-neutral-900'}`}>
                      {formatRouteEndpointsLabel(trip.routeId) || 'Route'}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : scheduleStatusClass(trip.status)
                      }`}
                    >
                      {formatScheduleStatusLabel(trip.status)}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${isActive ? 'text-white/80' : 'text-on-surface-variant'}`}>
                    {formatTripDate(trip.tripDate)} · {trip.departureTime || '—'} –{' '}
                    {trip.arrivalTime || '—'}
                  </p>
                  <p className={`mt-0.5 text-xs ${isActive ? 'text-white/70' : 'text-on-surface-variant'}`}>
                    Bus {trip.busId?.regNumber || '—'}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex min-h-[420px] flex-col">
        <div className="border-b border-outline-variant px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900">
                {formatRouteEndpointsLabel(route) || 'Route'}
              </p>
              {route.distance != null ? (
                <p className="mt-0.5 text-xs text-on-surface-variant">{route.distance} km</p>
              ) : null}
              {formatRouteStopsLabel(route) ? (
                <p className="mt-1 text-xs text-on-surface-variant">
                  Stops: {formatRouteStopsLabel(route)}
                </p>
              ) : null}
            </div>
            <div className="text-right text-xs text-on-surface-variant">
              <p className="font-semibold text-neutral-900">{formatTripDate(selected.tripDate)}</p>
              <p className="mt-0.5 tabular-nums">
                {selected.departureTime || '—'} – {selected.arrivalTime || '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative min-h-[360px] flex-1">
          {mapProps.startPoint?.trim() && mapProps.endPoint?.trim() ? (
            <RouteMap {...mapProps} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container/30 px-6 text-center">
              <Icon name="map" size={48} className="mb-3 text-on-surface-variant/40" />
              <p className="text-sm font-medium text-neutral-900">Route locations unavailable</p>
              <p className="mt-1 max-w-sm text-xs text-on-surface-variant">
                This trip&apos;s route does not have start and end points configured yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DriverTripLocationView
