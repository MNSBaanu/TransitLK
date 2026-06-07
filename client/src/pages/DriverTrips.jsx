import { useCallback, useState } from 'react'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useFastPageLoad } from '../hooks/useFastPageLoad'
import { getStalePageData } from '../services/pagePrefetch'
import {
  formatRouteEndpointsLabel,
  formatScheduleStatusLabel,
  formatTripDate,
  formatTimeRange,
  scheduleStatusClass,
} from '../utils/scheduleHelpers'
import { ModuleHeader, ModuleCard } from '../components/layout/ModuleLayout'

function DriverTrips() {
  const { user } = useAuth()
  const [trips, setTrips] = useState(() => getStalePageData('/my-trips')?.trips || [])
  const [error, setError] = useState('')

  const applyData = useCallback((payload) => {
    setTrips(payload?.trips || [])
    setError('')
  }, [])

  const { loading } = useFastPageLoad('/my-trips', { applyData })

  const upcoming = trips.filter((t) => t.status !== 'cancelled' && t.status !== 'completed')

  return (
    <div className="w-full">
      <ModuleHeader
        title="My assigned trips"
        subtitle={`Welcome, ${user?.name || 'Driver'} — approved trips only appear here after the depot manager releases your schedule.`}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <p className="text-xs font-semibold uppercase text-on-surface-variant">Upcoming</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{upcoming.length}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <p className="text-xs font-semibold uppercase text-on-surface-variant">License</p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">{user?.licenseNo || '—'}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <p className="text-xs font-semibold uppercase text-on-surface-variant">Status</p>
          <p className="mt-1 text-sm font-semibold capitalize text-neutral-900">
            {user?.status || 'available'}
          </p>
        </div>
      </div>

      <ModuleCard className="overflow-hidden p-0">
        {loading && trips.length === 0 ? (
          <p className="p-8 text-center text-on-surface-variant">Loading trips...</p>
        ) : trips.length === 0 ? (
          <p className="p-8 text-center text-on-surface-variant">
            No approved trips in this period. New duties appear here after the depot manager approves
            your schedule.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {trips.map((trip) => (
              <li key={trip._id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-depot-navy/10 text-depot-navy">
                  <Icon name="event" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900">
                    {formatRouteEndpointsLabel(trip.routeId) || 'Route'}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {formatTripDate(trip.tripDate)} ·{' '}
                    {formatTimeRange(trip.departureTime, trip.arrivalTime)}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Bus {trip.busId?.regNumber || '—'} · {trip.routeId?.startPoint} →{' '}
                    {trip.routeId?.endPoint}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${scheduleStatusClass(trip.status)}`}
                >
                  {formatScheduleStatusLabel(trip.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ModuleCard>
    </div>
  )
}

export default DriverTrips
