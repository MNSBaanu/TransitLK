import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Icon from '../components/Icon'
import { ModuleHeader } from '../components/layout/ModuleLayout'

const MAIN_CATEGORIES = [
  {
    key: 'maintenance',
    label: 'Maintenance',
    icon: 'build',
    types: ['maintenance_due', 'overdue_maintenance'],
  },
  {
    key: 'conflicts',
    label: 'Conflicts',
    icon: 'swap_horiz',
    types: ['schedule_conflict'],
  },
  {
    key: 'delays',
    label: 'Delays',
    icon: 'schedule',
    types: ['delayed_trip'],
  },
  {
    key: 'issues',
    label: 'Issues',
    icon: 'warning',
    types: ['driver_issue'],
  },
  {
    key: 'approvals',
    label: 'Approvals',
    icon: 'check_circle',
    types: ['trip_approved'],
  },
  {
    key: 'fleet',
    label: 'Fleet',
    icon: 'directions_bus',
    types: ['bus_status_change'],
  },
  {
    key: 'licenses',
    label: 'Licenses',
    icon: 'person',
    types: ['license_expiry_warning'],
  },
]

const PRIORITY_STYLES = {
  critical: 'bg-red-500 text-white',
  high:     'bg-amber-500 text-white',
  medium:   'bg-depot-blue-light text-white',
  low:      'bg-slate-400 text-white',
}

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [openCategory, setOpenCategory] = useState(null)
  const [expandedNotifId, setExpandedNotifId] = useState(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data || [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const categoriesWithCounts = useMemo(() => {
    return MAIN_CATEGORIES.map((cat) => {
      const items = notifications.filter((n) => cat.types.includes(n.type))
      return {
        ...cat,
        items,
        count: items.length,
        unread: items.filter((n) => !n.read).length,
      }
    })
  }, [notifications])

  const totalUnread = notifications.filter((n) => !n.read).length
  const hasNotifs = notifications.length > 0

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      )
    } catch {}
  }

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {}
  }

  const handleNavigate = (n) => {
    handleMarkRead(n._id)
    if (n.link) navigate(n.link)
  }

  const toggleCategory = (key) => {
    setOpenCategory((prev) => (prev === key ? null : key))
    setExpandedNotifId(null)
  }

  const toggleNotif = (id) => {
    setExpandedNotifId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Notifications"
        subtitle={
          totalUnread > 0
            ? `${totalUnread} unread notification${totalUnread > 1 ? 's' : ''}`
            : 'All caught up — no unread notifications'
        }
        action={
          totalUnread > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="btn-outlined flex items-center gap-2 text-sm"
            >
              <Icon name="check_circle" size={18} />
              Mark all as read
            </button>
          ) : null
        }
      />

      {loading ? (
        <div className="glass-card flex min-h-[300px] items-center justify-center">
          <p className="text-sm text-fleet-ink-muted">Loading notifications...</p>
        </div>
      ) : !hasNotifs ? (
        <div className="glass-card flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Icon name="notifications" size={48} className="text-fleet-ink-muted/40" />
          <p className="text-sm font-medium text-fleet-ink-muted">No notifications yet</p>
          <p className="text-xs text-fleet-ink-muted/70">
            System alerts and updates will appear here when available.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categoriesWithCounts.map((cat, idx) => {
            const isOpen = openCategory === cat.key
            const iconBg = idx % 2 === 0 ? 'bg-depot-navy/10' : 'bg-depot-blue-light/15'
            return (
              <div
                key={cat.key}
                className={`glass-card overflow-hidden transition-all ${
                  isOpen ? 'md:col-span-2 xl:col-span-3' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.key)}
                  className={`flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/20 ${
                    cat.count > 0 ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                      <Icon name={cat.icon} size={22} className="text-depot-navy" />
                      {cat.unread > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-depot-blue-light px-1 text-[10px] font-bold text-white">
                          {cat.unread > 9 ? '9+' : cat.unread}
                        </span>
                      )}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-fleet-ink">{cat.label}</h3>
                      <p className="text-xs text-fleet-ink-muted">
                        {cat.count} notification{cat.count !== 1 ? 's' : ''}
                        {cat.unread > 0 && (
                          <span className="ml-1.5 font-semibold text-depot-navy">
                            · {cat.unread} unread
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {cat.count > 0 && (
                    <Icon
                      name={isOpen ? 'chevron_up' : 'chevron_down'}
                      size={18}
                      className="shrink-0 text-fleet-ink-muted/50"
                    />
                  )}
                </button>

                {isOpen && cat.count > 0 && (
                  <div className="border-t border-white/30">
                    {cat.items.map((n) => {
                      const isExpanded = expandedNotifId === n._id
                      const pStyle = PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.medium
                      return (
                        <div key={n._id} className="border-b border-white/20 last:border-0">
                          <button
                            type="button"
                            onClick={() => toggleNotif(n._id)}
                            className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/20 ${
                              !n.read ? 'bg-depot-navy/[0.03]' : ''
                            }`}
                          >
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${pStyle}`}>
                              {n.priority === 'critical' || n.priority === 'high' ? '!' : ''}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className={`text-sm font-semibold ${!n.read ? 'text-fleet-ink' : 'text-fleet-ink-muted'}`}>
                                  {n.title}
                                </span>
                                <span className="shrink-0 text-[10px] text-fleet-ink-muted/70">
                                  {formatRelativeTime(n.createdAt)}
                                </span>
                              </div>
                              {!isExpanded && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-fleet-ink-muted">
                                  {n.message}
                                </p>
                              )}
                            </div>
                            <Icon
                              name={isExpanded ? 'chevron_up' : 'chevron_down'}
                              size={14}
                              className="mt-1 shrink-0 text-fleet-ink-muted/40"
                            />
                          </button>

                          {isExpanded && (
                            <div className="border-t border-white/20 bg-white/30 px-5 py-4">
                              <div className="mb-3 space-y-2">
                                <p className="text-sm leading-relaxed text-fleet-ink">{n.message}</p>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-fleet-ink-muted">
                                  <span>
                                    Priority:{' '}
                                    <span className={`font-semibold capitalize ${n.priority === 'critical' || n.priority === 'high' ? 'text-red-600' : ''}`}>
                                      {n.priority}
                                    </span>
                                  </span>
                                  {n.createdAt && (
                                    <>
                                      <span>·</span>
                                      <span>{new Date(n.createdAt).toLocaleString('en-GB')}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {n.data && Object.keys(n.data).length > 0 && (
                                <div className="mb-3 rounded-xl border border-white/40 bg-white/40 px-4 py-3">
                                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-fleet-ink-muted">
                                    Additional Details
                                  </p>
                                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                    {Object.entries(n.data).map(([key, val]) => (
                                      <div key={key} className="flex justify-between gap-2">
                                        <dt className="font-medium text-fleet-ink-muted capitalize">
                                          {key.replace(/_/g, ' ')}
                                        </dt>
                                        <dd className="font-semibold text-fleet-ink text-right">
                                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                {!n.read && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleMarkRead(n._id)
                                    }}
                                    className="btn-outlined flex items-center gap-1.5 py-1.5 text-xs"
                                  >
                                    <Icon name="check_circle" size={14} />
                                    Mark as read
                                  </button>
                                )}
                                {n.link && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleNavigate(n)
                                    }}
                                    className="btn-primary flex items-center gap-1.5 py-1.5 text-xs"
                                  >
                                    <Icon name="arrow_forward" size={14} />
                                    View details
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Notifications
