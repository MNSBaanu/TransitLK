import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useFastPageLoad } from '../hooks/useFastPageLoad'
import { getStalePageData, invalidatePageData } from '../services/pagePrefetch'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import ScheduleTripDetailsDrawer from '../components/schedules/ScheduleTripDetailsDrawer'
import {
  formatRouteEndpointsLabel,
  formatRouteStopsLabel,
  formatTimeRange,
  formatTripDate,
  tripDateKey,
} from '../utils/scheduleHelpers'
import {
  ModuleHeader,
  ModuleSecondaryButton,
  ModuleToast,
} from '../components/layout/ModuleLayout'

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900'

function canManagePendingApprovals(role) {
  return role === ROLES.DEPOT_MANAGER || role === ROLES.ADMINISTRATOR
}

function canViewRejectedApprovals(role) {
  return role === ROLES.TRANSPORT_SCHEDULER || role === ROLES.ADMINISTRATOR
}

function canAccessApprovalsPage(role) {
  return canManagePendingApprovals(role) || role === ROLES.TRANSPORT_SCHEDULER
}

function defaultTabForRole(role) {
  if (role === ROLES.TRANSPORT_SCHEDULER) return 'rejected'
  return 'pending'
}

function TripListRow({
  trip,
  index,
  saving,
  onView,
  onApprove,
  onReject,
  onEdit,
  onResubmit,
  showRejectionReason = false,
}) {
  const route = trip.routeId || {}
  const routeTitle = route.routeName?.trim() || formatRouteEndpointsLabel(route)
  const stopsLabel = formatRouteStopsLabel(route)
  const timeAndStops = [formatTimeRange(trip.departureTime, trip.arrivalTime), stopsLabel]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3">
      <span className="w-8 shrink-0 text-sm font-medium tabular-nums text-neutral-400">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-neutral-900">{routeTitle}</p>
        <p className="text-sm text-on-surface-variant">{timeAndStops}</p>
        <p className="text-xs text-on-surface-variant">
          {formatTripDate(tripDateKey(trip))}
          {trip.busId?.regNumber ? ` · ${trip.busId.regNumber}` : ''}
          {trip.driverId?.name ? ` · ${trip.driverId.name}` : ''}
        </p>
        {showRejectionReason && trip.rejectionReason ? (
          <p className="mt-1 text-xs font-medium text-red-700">Reason: {trip.rejectionReason}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onView(trip)}
          className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold text-depot-blue-light hover:bg-surface-container disabled:opacity-50"
        >
          View
        </button>
        {onApprove && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onApprove(trip._id)}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onEdit(trip)}
            className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold text-neutral-900 hover:bg-surface-container disabled:opacity-50"
          >
            Edit trip
          </button>
        )}
        {onResubmit && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onResubmit(trip._id)}
            className="rounded-lg bg-depot-blue-light px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            Resubmit
          </button>
        )}
        {onReject && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onReject(trip)}
            className="rounded-lg border border-red-300 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Reject
          </button>
        )}
      </div>
    </li>
  )
}

function ApprovalListPanel({ variant, count, label, emptyTitle, emptyBody, children }) {
  const styles =
    variant === 'rejected'
      ? {
          shell: 'border-red-200 bg-red-50/50',
          header: 'border-red-200 text-red-900',
          divider: 'divide-red-100',
          icon: 'cancel',
        }
      : {
          shell: 'border-amber-200 bg-amber-50/50',
          header: 'border-amber-200 text-amber-900',
          divider: 'divide-amber-100',
          icon: 'pending_actions',
        }

  if (count === 0) {
    return (
      <div className="rounded-xl border border-outline-variant bg-white px-6 py-12 text-center">
        <Icon name="check_circle" size={40} className="mx-auto text-emerald-500" />
        <p className="mt-3 text-sm font-semibold text-neutral-900">{emptyTitle}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{emptyBody}</p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${styles.shell}`}>
      <p className={`flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold ${styles.header}`}>
        <Icon name={styles.icon} size={20} />
        {count} {label}
      </p>
      <ul className={`divide-y ${styles.divider}`}>{children}</ul>
    </div>
  )
}

function ScheduleApprovals() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const role = user?.role
  const canManagePending = canManagePendingApprovals(role)
  const canViewRejected = canViewRejectedApprovals(role)
  const isAdministrator = role === ROLES.ADMINISTRATOR
  const canAccess = canAccessApprovalsPage(role)

  const stale = getStalePageData('/schedules/approvals')
  const [pending, setPending] = useState(() => stale?.pending || [])
  const [rejected, setRejected] = useState(() => stale?.rejected || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [rejectTargetId, setRejectTargetId] = useState(null)
  const [rejectTargetTrip, setRejectTargetTrip] = useState(null)
  const [rejectReason, setRejectReason] = useState('Incomplete allocation')
  const [viewTrip, setViewTrip] = useState(null)
  const canFixRejected =
    role === ROLES.TRANSPORT_SCHEDULER || role === ROLES.ADMINISTRATOR

  const activeTab = useMemo(() => {
    const requested = searchParams.get('tab')
    if (isAdministrator) {
      return requested === 'rejected' ? 'rejected' : 'pending'
    }
    return defaultTabForRole(role)
  }, [searchParams, isAdministrator, role])

  useEffect(() => {
    if (!canAccess) return
    const expectedTab = defaultTabForRole(role)
    if (!isAdministrator && searchParams.get('tab') !== expectedTab) {
      setSearchParams({ tab: expectedTab }, { replace: true })
    }
  }, [canAccess, isAdministrator, role, searchParams, setSearchParams])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const applyData = useCallback((payload) => {
    setPending(payload?.pending || [])
    setRejected(payload?.rejected || [])
    setError('')
  }, [])

  const { loading, reload } = useFastPageLoad('/schedules/approvals', {
    applyData,
    enabled: canAccess,
    refreshEnabled: canAccess && !saving && !rejectTargetId,
  })

  const handleApprove = async (id) => {
    setSaving(true)
    setError('')
    try {
      await api.post(`/schedules/${id}/approve`)
      invalidatePageData('/schedules')
      invalidatePageData('/schedules/approvals')
      invalidatePageData('/reports')
      invalidatePageData('/buses')
      showToast('Schedule approved — driver can view the trip in My trips')
      await reload({ keepContent: true, force: true })
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
      setRejectTargetTrip(null)
      invalidatePageData('/schedules')
      invalidatePageData('/schedules/approvals')
      invalidatePageData('/reports')
      invalidatePageData('/buses')
      showToast('Returned to scheduler')
      await reload({ keepContent: true, force: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Reject failed')
    } finally {
      setSaving(false)
    }
  }

  const handleEditTrip = (trip) => {
    navigate('/schedules', {
      state: {
        focusScheduleId: trip._id,
        viewDate: tripDateKey(trip),
        openAdjust: true,
      },
    })
  }

  const handleResubmit = async (id) => {
    setSaving(true)
    setError('')
    try {
      await api.post(`/schedules/${id}/submit`)
      invalidatePageData('/schedules')
      invalidatePageData('/schedules/approvals')
      invalidatePageData('/reports')
      invalidatePageData('/buses')
      showToast('Trip resubmitted for approval')
      await reload({ keepContent: true, force: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Resubmit failed')
    } finally {
      setSaving(false)
    }
  }

  const closeRejectModal = () => {
    if (saving) return
    setRejectTargetId(null)
    setRejectTargetTrip(null)
  }

  const pageTitle = isAdministrator
    ? 'Schedule approvals'
    : role === ROLES.DEPOT_MANAGER
      ? 'Pending schedule approvals'
      : 'Rejected approvals'

  const pageSubtitle = isAdministrator
    ? 'Review pending trips and inspect rejected schedules returned to schedulers.'
    : role === ROLES.DEPOT_MANAGER
      ? 'Review trips submitted by transport schedulers. Approve to publish for drivers, or reject to return as draft.'
      : 'Trips returned by the depot manager with a reason. Update the plan and submit again for approval.'

  if (!canAccess) {
    return (
      <div className="w-full">
        <ModuleHeader
          title="Schedule approvals"
          subtitle="This page is for depot managers, administrators, and transport schedulers."
        />
        <Link to="/schedules" className="text-sm font-semibold text-depot-blue-light hover:underline">
          Back to schedules
        </Link>
      </div>
    )
  }

  const showPendingSection = canManagePending && (isAdministrator ? activeTab === 'pending' : true)
  const showRejectedSection = canViewRejected && (isAdministrator ? activeTab === 'rejected' : true)

  return (
    <div className="w-full">
      <ModuleToast message={toast} />

      <ModuleHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        action={
          <ModuleSecondaryButton icon="arrow_back" onClick={() => navigate('/schedules')}>
            Back to timetable
          </ModuleSecondaryButton>
        }
      />

      {isAdministrator && (
        <div className="mb-5 flex gap-1 border-b border-outline-variant">
          {[
            { key: 'pending', label: 'Pending approvals', count: pending.length },
            { key: 'rejected', label: 'Rejected approvals', count: rejected.length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSearchParams({ tab: key })}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${
                activeTab === key
                  ? 'border-depot-blue-light text-depot-blue-light'
                  : 'border-transparent text-on-surface-variant hover:text-neutral-900'
              }`}
            >
              {label}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  key === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading schedules…</p>
      ) : (
        <>
          {showPendingSection && (
            <ApprovalListPanel
              variant="pending"
              count={pending.length}
              label={`schedule${pending.length === 1 ? '' : 's'} awaiting approval`}
              emptyTitle="No schedules awaiting approval"
              emptyBody="When schedulers submit trips, they will appear here for review."
            >
              {pending.map((trip, index) => (
                <TripListRow
                  key={trip._id}
                  trip={trip}
                  index={index}
                  saving={saving}
                  onView={setViewTrip}
                  onApprove={handleApprove}
                  onReject={(item) => {
                    setRejectReason('Incomplete allocation')
                    setRejectTargetId(item._id)
                    setRejectTargetTrip(item)
                  }}
                />
              ))}
            </ApprovalListPanel>
          )}

          {showRejectedSection && (
            <ApprovalListPanel
              variant="rejected"
              count={rejected.length}
              label={`schedule${rejected.length === 1 ? '' : 's'} rejected`}
              emptyTitle="No rejected schedules"
              emptyBody="Rejected trips will appear here with the depot manager's reason."
            >
              {rejected.map((trip, index) => (
                <TripListRow
                  key={trip._id}
                  trip={trip}
                  index={index}
                  saving={saving}
                  onView={setViewTrip}
                  onEdit={canFixRejected ? handleEditTrip : undefined}
                  onResubmit={canFixRejected ? handleResubmit : undefined}
                  showRejectionReason
                />
              ))}
            </ApprovalListPanel>
          )}
        </>
      )}

      <ScheduleTripDetailsDrawer
        open={Boolean(viewTrip)}
        onClose={() => setViewTrip(null)}
        selected={viewTrip}
        canAdjustSchedules={false}
      />

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
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={saving || !rejectTargetTrip}
                onClick={() => rejectTargetTrip && setViewTrip(rejectTargetTrip)}
                className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-depot-blue-light hover:bg-surface-container disabled:opacity-60"
              >
                View
              </button>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeRejectModal}
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
        </div>
      )}
    </div>
  )
}

export default ScheduleApprovals
