import { useCallback, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import DriverTripCard from '../components/driver/DriverTripCard'
import useDriverLiveLocationSharing from '../hooks/useDriverLiveLocationSharing'
import { useAuth } from '../context/AuthContext'
import { useFastPageLoad } from '../hooks/useFastPageLoad'
import { getStalePageData, invalidatePageData } from '../services/pagePrefetch'
import { formatServiceType } from '../utils/fleetHelpers'
import {
  formatRouteEndpointsLabel,
  formatScheduleStatusLabel,
  formatTripDate,
} from '../utils/scheduleHelpers'
import { ModuleHeader, ModuleCard, ModuleToast } from '../components/layout/ModuleLayout'

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900'

function DriverTrips() {
  const { user, refreshSession } = useAuth()
  const [trips, setTrips] = useState(() => getStalePageData('/my-trips')?.trips || [])
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [issueTrip, setIssueTrip] = useState(null)
  const [issueNotes, setIssueNotes] = useState('')

  const applyData = useCallback((payload) => {
    setTrips(payload?.trips || [])
    setError('')
  }, [])

  const { loading, reload } = useFastPageLoad('/my-trips', { applyData })

  const handleTripUpdate = useCallback((updated) => {
    setTrips((prev) => prev.map((t) => (String(t._id) === String(updated._id) ? updated : t)))
  }, [])

  const { geoError: liveGeoError, sharingBusy, setSharing } = useDriverLiveLocationSharing(
    trips,
    handleTripUpdate
  )

  const upcoming = trips.filter((t) => t.status !== 'cancelled' && t.status !== 'completed')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSharingToggle = async (tripId, enabled) => {
    try {
      await setSharing(tripId, enabled)
      showToast(
        enabled
          ? 'Live location sharing enabled for this trip'
          : 'Live location sharing stopped for this trip'
      )
    } catch {
      // hook sets geo error
    }
  }

  const handleStatusChange = async (tripId, status, notes) => {
    setSavingId(tripId)
    setError('')
    try {
      const { data } = await api.patch(`/schedules/${tripId}/trip-status`, { status, notes })
      setTrips((prev) => prev.map((t) => (String(t._id) === String(tripId) ? data : t)))
      invalidatePageData('/my-trips')
      invalidatePageData('/schedules')
      invalidatePageData('/buses')
      invalidatePageData('/routes')
      showToast(
        status === 'on-duty'
          ? 'Trip started — open Trip location below to share live GPS with depot'
          : `Trip updated — ${formatScheduleStatusLabel(status)}`
      )
      await refreshSession()
      await reload({ keepContent: true, force: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update trip')
    } finally {
      setSavingId(null)
    }
  }

  const handleAcknowledge = (tripId) => handleStatusChange(tripId, 'on-duty')
  const handleComplete = (tripId) => handleStatusChange(tripId, 'completed')

  const openIssueModal = (trip) => {
    setIssueTrip(trip)
    setIssueNotes('')
    setError('')
  }

  const closeIssueModal = () => {
    if (savingId) return
    setIssueTrip(null)
    setIssueNotes('')
  }

  const handleReportIssue = async () => {
    if (!issueTrip || !issueNotes.trim()) {
      setError('Please describe the issue before submitting')
      return
    }
    const tripId = issueTrip._id
    const notes = issueNotes.trim()
    setSavingId(tripId)
    setError('')
    try {
      const { data } = await api.patch(`/schedules/${tripId}/trip-status`, {
        status: 'delayed',
        notes,
      })
      setTrips((prev) => prev.map((t) => (String(t._id) === String(tripId) ? data : t)))
      invalidatePageData('/my-trips')
      invalidatePageData('/schedules')
      invalidatePageData('/buses')
      invalidatePageData('/routes')
      setIssueTrip(null)
      setIssueNotes('')
      showToast('Issue reported — scheduler and admin notified')
      await refreshSession()
      await reload({ keepContent: true, force: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to report issue')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="w-full">
      <ModuleToast message={toast} />

      <ModuleHeader
        title="My assigned trips"
        subtitle={`Welcome, ${user?.name || 'Driver'} — each trip includes route map and live location sharing after you start.`}
      />

      {error && !issueTrip && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {liveGeoError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {liveGeoError}
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
          <p className="mt-1 text-sm font-semibold text-neutral-900">
            {formatServiceType(user?.status || 'available')}
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
          <div className="space-y-4 p-4">
            {trips.map((trip) => (
              <DriverTripCard
                key={trip._id}
                trip={trip}
                isSaving={savingId === trip._id}
                sharingBusy={sharingBusy}
                onSharingToggle={handleSharingToggle}
                onAcknowledge={handleAcknowledge}
                onReportIssue={openIssueModal}
                onComplete={handleComplete}
              />
            ))}
          </div>
        )}
      </ModuleCard>

      {issueTrip && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <Icon name="report_problem" size={22} />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Report issue</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {formatRouteEndpointsLabel(issueTrip.routeId)} ·{' '}
                  {formatTripDate(issueTrip.tripDate)}
                </p>
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">
                Describe the issue
              </span>
              <textarea
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                rows={4}
                className={`${inputClass} resize-none`}
                placeholder="e.g. Traffic delay, vehicle fault, road obstruction…"
              />
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(savingId)}
                onClick={closeIssueModal}
                className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(savingId) || !issueNotes.trim()}
                onClick={handleReportIssue}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                <Icon name="report_problem" size={16} />
                {savingId ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriverTrips
