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
  formatApprovalReceived,
  formatApprovalResponded,
  formatApprovalSent,
  sortApprovalTripsByRecent,
  tripDateKey,
} from '../utils/scheduleHelpers'
import {
  ModuleHeader,
  ModuleSecondaryButton,
  ModuleToast,
} from '../components/layout/ModuleLayout'

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900'
const labelClass = 'text-[10px] font-bold uppercase tracking-wide text-on-surface-variant'
const cellClass = 'px-3 py-3 align-top text-sm'

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

function TripTableRow({
  trip,
  index,
  saving,
  variant,
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

  return (
    <tr className="bg-white">
      <td className={`${cellClass} w-10 tabular-nums text-neutral-400`}>{index + 1}</td>
      <td className={cellClass}>
        <p className="font-semibold text-neutral-900">{routeTitle}</p>
        <p className="text-xs text-on-surface-variant">{formatTripDate(tripDateKey(trip))}</p>
      </td>
      <td className={cellClass}>
        <p className="text-neutral-900">{formatTimeRange(trip.departureTime, trip.arrivalTime)}</p>
        {stopsLabel ? (
          <p className="mt-0.5 text-xs text-on-surface-variant">{stopsLabel}</p>
        ) : null}
      </td>
      <td className={cellClass}>
        <p className="text-neutral-900">{trip.busId?.regNumber || '—'}</p>
        <p className="text-xs text-on-surface-variant">{trip.driverId?.name || '—'}</p>
      </td>
      {variant === 'pending' ? (
        <td className={`${cellClass} whitespace-nowrap text-xs text-neutral-800`}>
          {formatApprovalReceived(trip)}
        </td>
      ) : (
        <>
          <td className={`${cellClass} whitespace-nowrap text-xs text-neutral-800`}>
            {formatApprovalSent(trip)}
          </td>
          <td className={`${cellClass} whitespace-nowrap text-xs text-neutral-800`}>
            {formatApprovalResponded(trip)}
          </td>
        </>
      )}
      {showRejectionReason ? (
        <td className={cellClass}>
          {trip.rejectionReason ? (
            <p className="text-xs font-medium text-red-700">{trip.rejectionReason}</p>
          ) : (
            <span className="text-xs text-on-surface-variant">—</span>
          )}
        </td>
      ) : null}
      <td className={cellClass}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => onView(trip)}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold text-depot-blue-light hover:bg-surface-container disabled:opacity-50"
          >
            View
          </button>
          {onApprove && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onApprove(trip._id)}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onEdit(trip)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold text-neutral-900 hover:bg-surface-container disabled:opacity-50"
            >
              Edit trip
            </button>
          )}
          {onResubmit && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onResubmit(trip._id)}
              className="rounded-lg bg-depot-blue-light px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              Resubmit
            </button>
          )}
          {onReject && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onReject(trip)}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function ApprovalTableHeader({ variant, showRejectionReason = false }) {
  return (
    <thead>
      <tr className="border-b border-outline-variant text-left">
        <th className={`${labelClass} ${cellClass} w-10`}>#</th>
        <th className={`${labelClass} ${cellClass}`}>Route</th>
        <th className={`${labelClass} ${cellClass}`}>Trip</th>
        <th className={`${labelClass} ${cellClass}`}>Bus / Driver</th>
        {variant === 'pending' ? (
          <th className={`${labelClass} ${cellClass}`}>Received</th>
        ) : (
          <>
            <th className={`${labelClass} ${cellClass}`}>Sent</th>
            <th className={`${labelClass} ${cellClass}`}>Responded</th>
          </>
        )}
        {showRejectionReason ? (
          <th className={`${labelClass} ${cellClass}`}>Rejection reason</th>
        ) : null}
        <th className={`${labelClass} ${cellClass}`}>Actions</th>
      </tr>
    </thead>
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
    <div className={`overflow-x-auto rounded-xl border ${styles.shell}`}>
      <p className={`flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold ${styles.header}`}>
        <Icon name={styles.icon} size={20} />
        {count} {label}
      </p>
      <table className="w-full min-w-[820px]">
        {children}
      </table>
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
    setPending(sortApprovalTripsByRecent(payload?.pending, 'pending'))
    setRejected(sortApprovalTripsByRecent(payload?.rejected, 'rejected'))
    setError('')
  }, [])

  const sortedPending = useMemo(
    () => sortApprovalTripsByRecent(pending, 'pending'),
    [pending]
  )
  const sortedRejected = useMemo(
    () => sortApprovalTripsByRecent(rejected, 'rejected'),
    [rejected]
  )

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
            { key: 'pending', label: 'Pending approvals', count: sortedPending.length },
            { key: 'rejected', label: 'Rejected approvals', count: sortedRejected.length },
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
              count={sortedPending.length}
              label={`schedule${sortedPending.length === 1 ? '' : 's'} awaiting approval`}
              emptyTitle="No schedules awaiting approval"
              emptyBody="When schedulers submit trips, they will appear here for review."
            >
              <ApprovalTableHeader variant="pending" />
              <tbody className="divide-y divide-outline-variant">
              {sortedPending.map((trip, index) => (
                <TripTableRow
                  key={trip._id}
                  trip={trip}
                  index={index}
                  variant="pending"
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
              </tbody>
            </ApprovalListPanel>
          )}

          {showRejectedSection && (
            <ApprovalListPanel
              variant="rejected"
              count={sortedRejected.length}
              label={`schedule${sortedRejected.length === 1 ? '' : 's'} rejected`}
              emptyTitle="No rejected schedules"
              emptyBody="Rejected trips will appear here with the depot manager's reason."
            >
              <ApprovalTableHeader variant="rejected" showRejectionReason />
              <tbody className="divide-y divide-outline-variant">
              {sortedRejected.map((trip, index) => (
                <TripTableRow
                  key={trip._id}
                  trip={trip}
                  index={index}
                  variant="rejected"
                  saving={saving}
                  onView={setViewTrip}
                  onEdit={canFixRejected ? handleEditTrip : undefined}
                  onResubmit={canFixRejected ? handleResubmit : undefined}
                  showRejectionReason
                />
              ))}
              </tbody>
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
