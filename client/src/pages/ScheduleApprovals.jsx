import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { invalidatePageData } from '../services/pagePrefetch'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import {
  formatRouteEndpointsLabel,
  formatTripDate,
  scheduleCode,
  tripDateKey,
} from '../utils/scheduleHelpers'
import {
  ModuleHeader,
  ModuleSecondaryButton,
  ModuleToast,
} from '../components/layout/ModuleLayout'

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900'

const APPROVER_ROLES = new Set([ROLES.DEPOT_MANAGER, ROLES.ADMINISTRATOR])

function canApproveSchedules(role) {
  return APPROVER_ROLES.has(role)
}

function ScheduleApprovals() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [rejectTargetId, setRejectTargetId] = useState(null)
  const [rejectReason, setRejectReason] = useState('Incomplete allocation')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadPending = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/schedules', { params: { status: 'pending' } })
      setPending(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending schedules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canApproveSchedules(user?.role)) {
      loadPending()
    } else {
      setLoading(false)
    }
  }, [user?.role, loadPending])

  const handleApprove = async (id) => {
    setSaving(true)
    setError('')
    try {
      await api.post(`/schedules/${id}/approve`)
      invalidatePageData('/schedules')
      invalidatePageData('/reports')
      invalidatePageData('/buses')
      showToast('Schedule approved — driver can view the trip in My trips')
      await loadPending()
    } catch (err) {
      const msg = err.response?.data?.message || 'Approve failed'
      const conflictsData = err.response?.data?.conflicts
      setError(
        conflictsData?.length
          ? `${msg}: ${conflictsData.map((c) => c.message).join('; ')}`
          : msg
      )
    } finally {
      setSaving(false)
    }
  }

  const handleRejectConfirm = async () => {
    if (!rejectTargetId || !rejectReason.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.post(`/schedules/${rejectTargetId}/reject`, { reason: rejectReason.trim() })
      setRejectTargetId(null)
      invalidatePageData('/schedules')
      invalidatePageData('/reports')
      invalidatePageData('/buses')
      showToast('Returned to scheduler')
      await loadPending()
    } catch (err) {
      setError(err.response?.data?.message || 'Reject failed')
    } finally {
      setSaving(false)
    }
  }

  if (!canApproveSchedules(user?.role)) {
    return (
      <div className="w-full">
        <ModuleHeader
          title="Schedule approvals"
          subtitle="This page is for depot managers and administrators only."
        />
        <Link to="/schedules" className="text-sm font-semibold text-depot-blue-light hover:underline">
          Back to schedules
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ModuleToast message={toast} />

      <ModuleHeader
        title="Pending schedule approvals"
        subtitle="Review trips submitted by transport schedulers. Approve to publish for drivers, or reject to return as draft."
        action={
          <ModuleSecondaryButton icon="arrow_back" onClick={() => navigate('/schedules')}>
            Back to timetable
          </ModuleSecondaryButton>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading pending schedules…</p>
      ) : pending.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-white px-6 py-12 text-center">
          <Icon name="check_circle" size={40} className="mx-auto text-emerald-500" />
          <p className="mt-3 text-sm font-semibold text-neutral-900">No schedules awaiting approval</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            When schedulers submit trips, they will appear here for review.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50">
          <p className="flex items-center gap-2 border-b border-amber-200 px-4 py-3 text-sm font-semibold text-amber-900">
            <Icon name="pending_actions" size={20} />
            {pending.length} schedule{pending.length === 1 ? '' : 's'} awaiting approval
          </p>
          <ul className="divide-y divide-amber-100">
            {pending.map((trip, index) => (
              <li
                key={trip._id}
                className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3"
              >
                <span className="w-8 shrink-0 text-sm font-medium tabular-nums text-neutral-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900">{scheduleCode(trip)}</p>
                  <p className="text-sm text-on-surface-variant">
                    {formatRouteEndpointsLabel(trip.routeId)} · {trip.departureTime}–{trip.arrivalTime}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {formatTripDate(tripDateKey(trip))}
                    {trip.busId?.regNumber ? ` · ${trip.busId.regNumber}` : ''}
                    {trip.driverId?.name ? ` · ${trip.driverId.name}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleApprove(trip._id)}
                    className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setRejectReason('Incomplete allocation')
                      setRejectTargetId(trip._id)
                    }}
                    className="rounded-lg border border-red-300 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rejectTargetId && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                <Icon name="cancel" size={22} />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Reject schedule</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Return this trip to the scheduler as a draft. A reason is required.
                </p>
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Rejection reason</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="e.g. Incomplete bus or driver allocation"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => !saving && setRejectTargetId(null)}
                className="min-w-[7rem] rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !rejectReason.trim()}
                onClick={handleRejectConfirm}
                className="min-w-[7rem] rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? 'Please wait…' : 'Reject trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleApprovals
