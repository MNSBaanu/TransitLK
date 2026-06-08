import { useCallback, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useFastPageLoad } from '../hooks/useFastPageLoad'
import { getStalePageData, invalidatePageData } from '../services/pagePrefetch'
import {
  canDriverAcknowledgeTrip,
  canDriverCompleteTrip,
  canDriverReportIssue,
  formatRouteEndpointsLabel,
  formatScheduleStatusLabel,
  formatTripDate,
  scheduleStatusClass,
} from '../utils/scheduleHelpers'
import { ModuleHeader, ModuleCard, ModuleToast } from '../components/layout/ModuleLayout'

const labelClass = 'text-[10px] font-bold uppercase tracking-wide text-on-surface-variant'
const cellClass = 'px-3 py-3 align-top text-sm'
const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900'

function DriverTrips() {
  const { user } = useAuth()
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

  const upcoming = trips.filter((t) => t.status !== 'cancelled' && t.status !== 'completed')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleStatusChange = async (tripId, status, notes) => {
    setSavingId(tripId)
    setError('')
    try {
      const { data } = await api.patch(`/schedules/${tripId}/trip-status`, { status, notes })
      setTrips((prev) => prev.map((t) => (String(t._id) === String(tripId) ? data : t)))
      invalidatePageData('/my-trips')
      invalidatePageData('/schedules')
      showToast(`Trip updated — ${formatScheduleStatusLabel(status)}`)
      await reload({ keepContent: true, force: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update trip')
    } finally {
      setSavingId(null)
    }
  }

  const handleAcknowledge = (tripId) => handleStatusChange(tripId, 'on-time')

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
    await handleStatusChange(issueTrip._id, 'delayed', issueNotes.trim())
    setIssueTrip(null)
    setIssueNotes('')
  }

  return (
    <div className="w-full">
      <ModuleToast message={toast} />

      <ModuleHeader
        title="My assigned trips"
        subtitle={`Welcome, ${user?.name || 'Driver'} — approved trips only appear here after the depot manager releases your schedule.`}
      />

      {error && !issueTrip && (
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-outline-variant text-left">
                  <th className={`${labelClass} ${cellClass}`}>Route</th>
                  <th className={`${labelClass} ${cellClass}`}>Trip date</th>
                  <th className={`${labelClass} ${cellClass}`}>Departure time</th>
                  <th className={`${labelClass} ${cellClass}`}>Arrival time</th>
                  <th className={`${labelClass} ${cellClass}`}>Assigned bus</th>
                  <th className={`${labelClass} ${cellClass}`}>Current status</th>
                  <th className={`${labelClass} ${cellClass}`}>Acknowledge trip</th>
                  <th className={`${labelClass} ${cellClass}`}>Report issue</th>
                  <th className={`${labelClass} ${cellClass}`}>Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {trips.map((trip) => {
                  const isSaving = savingId === trip._id
                  const canAcknowledge = canDriverAcknowledgeTrip(trip.status)
                  const canReport = canDriverReportIssue(trip.status)
                  const canComplete = canDriverCompleteTrip(trip.status)

                  return (
                    <tr key={trip._id} className="bg-white">
                      <td className={cellClass}>
                        <p className="font-semibold text-neutral-900">
                          {formatRouteEndpointsLabel(trip.routeId) || 'Route'}
                        </p>
                      </td>
                      <td className={`${cellClass} whitespace-nowrap tabular-nums`}>
                        {formatTripDate(trip.tripDate)}
                      </td>
                      <td className={`${cellClass} whitespace-nowrap tabular-nums`}>
                        {trip.departureTime || '—'}
                      </td>
                      <td className={`${cellClass} whitespace-nowrap tabular-nums`}>
                        {trip.arrivalTime || '—'}
                      </td>
                      <td className={cellClass}>{trip.busId?.regNumber || '—'}</td>
                      <td className={cellClass}>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${scheduleStatusClass(trip.status)}`}
                        >
                          {formatScheduleStatusLabel(trip.status)}
                        </span>
                      </td>
                      <td className={cellClass}>
                        <button
                          type="button"
                          disabled={!canAcknowledge || isSaving}
                          onClick={() => handleAcknowledge(trip._id)}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSaving ? 'Saving…' : 'Acknowledge'}
                        </button>
                      </td>
                      <td className={cellClass}>
                        <button
                          type="button"
                          disabled={!canReport || isSaving}
                          onClick={() => openIssueModal(trip)}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Report issue
                        </button>
                      </td>
                      <td className={cellClass}>
                        <button
                          type="button"
                          disabled={!canComplete || isSaving}
                          onClick={() => handleComplete(trip._id)}
                          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Completed
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
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
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
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
