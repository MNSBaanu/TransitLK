import Icon from '../Icon'

const notifStyles = {
  error: { icon: 'error', bg: 'bg-red-500/15', text: 'text-red-600' },
  warning: { icon: 'warning', bg: 'bg-amber-500/15', text: 'text-amber-700' },
  info: { icon: 'info', bg: 'bg-depot-navy/10', text: 'text-depot-navy' },
}

const NOTIFICATION_CATEGORIES = {
  maintenance_due:        { label: 'Maintenance Due',        icon: 'build',         description: 'Scheduled bus maintenance approaching' },
  overdue_maintenance:    { label: 'Overdue Maintenance',    icon: 'report',        description: 'Bus maintenance past its due date' },
  schedule_conflict:      { label: 'Schedule Conflict',      icon: 'swap_horiz',    description: 'Overlapping or conflicting trips detected' },
  delayed_trip:           { label: 'Delayed Trip',           icon: 'schedule',      description: 'A trip has been marked as delayed' },
  driver_issue:           { label: 'Driver Issue',           icon: 'warning',       description: 'Driver reported a problem during a trip' },
  trip_approved:          { label: 'Trip Approved',          icon: 'check_circle',  description: 'A pending trip has been approved' },
  bus_status_change:      { label: 'Bus Status Change',      icon: 'directions_bus', description: 'Bus status has been updated' },
  license_expiry_warning: { label: 'License Expiry Warning', icon: 'person',        description: 'Driver license is expiring or expired' },
}

const priorityStyles = {
  critical: { label: 'Critical', bg: 'bg-red-100 text-red-700' },
  high:     { label: 'High',     bg: 'bg-amber-100 text-amber-700' },
  medium:   { label: 'Medium',   bg: 'bg-blue-100 text-blue-700' },
  low:      { label: 'Low',      bg: 'bg-slate-100 text-slate-600' },
}

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function NavNotificationsPanel({ hub, onClose }) {
  if (hub.activeNotification) {
    const notif = hub.activeNotification
    const cat = NOTIFICATION_CATEGORIES[notif.category] || { label: notif.category || 'Alert', icon: 'info', description: '' }
    const pStyle = priorityStyles[notif.priority] || priorityStyles.medium

    return (
      <div className="flex flex-col">
        <div className="border-b border-white/40 p-3">
          <button
            type="button"
            onClick={() => hub.setActiveNotificationId(null)}
            className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-depot-navy hover:text-depot-blue-light"
          >
            <Icon name="arrow_back" size={16} />
            Back to notifications
          </button>
          <div className="flex items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${notifStyles[notif.type]?.bg || 'bg-depot-navy/10'}`}>
              <Icon name={cat.icon} size={20} className={notifStyles[notif.type]?.text || 'text-depot-navy'} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-fleet-ink">{notif.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pStyle.bg}`}>
                  {pStyle.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-fleet-ink-muted">
                <span className="font-medium text-depot-navy">{cat.label}</span>
                {' \u00B7 '}
                {hub.formatRelativeTime(notif.time)}
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-60 space-y-3 overflow-y-auto p-3">
          <div className="glass-subtle rounded-2xl px-4 py-3 text-sm text-fleet-ink leading-relaxed">
            {notif.body}
          </div>

          {notif.data && Object.keys(notif.data).length > 0 && (
            <div className="rounded-xl border border-white/40 bg-white/20 px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-fleet-ink-muted">Details</p>
              <dl className="space-y-1">
                {Object.entries(notif.data).map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-2 text-xs">
                    <dt className="font-medium text-fleet-ink-muted capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-semibold text-fleet-ink text-right">{String(val)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {notif.link && notif.link !== '/dashboard' && (
            <button
              type="button"
              onClick={() => {
                hub.openNotification(notif)
                onClose()
              }}
              className="btn-primary w-full justify-center py-2.5 text-sm"
            >
              <Icon name="arrow_forward" size={16} />
              Go to {cat.label}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="glass-subtle mb-3 flex items-center justify-between rounded-xl px-3 py-2.5">
        <span className="text-xs font-medium text-fleet-ink-muted">
          {hub.unreadNotifCount > 0 ? (
            <>
              <span className="font-bold text-depot-navy">{hub.unreadNotifCount}</span> unread alert
              {hub.unreadNotifCount > 1 ? 's' : ''}
            </>
          ) : (
            'All caught up'
          )}
        </span>
        {hub.unreadNotifCount > 0 && (
          <span className="rounded-full bg-depot-blue-light/20 px-2 py-0.5 text-[10px] font-bold text-depot-navy">
            Live
          </span>
        )}
      </div>

      {hub.loadingAlerts ? (
        <div className="glass-subtle flex items-center justify-center rounded-xl py-10">
          <p className="text-sm text-fleet-ink-muted">Loading alerts...</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {hub.notifications.map((n) => {
            const style = notifStyles[n.type] || notifStyles.info
            const cat = NOTIFICATION_CATEGORIES[n.category]
            const isUnread = !n.read && n.id !== 'all-clear'
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => hub.selectNotification(n.id)}
                  className={`flex w-full gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                    isUnread
                      ? 'glass-subtle border-depot-blue-light/30 ring-1 ring-depot-blue-light/25'
                      : 'border-white/40 bg-white/30 opacity-90 hover:bg-white/45'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.bg}`}
                  >
                    <Icon name={style.icon} size={20} className={style.text} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-fleet-ink">{n.title}</span>
                      {isUnread && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-depot-blue-light" />
                      )}
                    </span>
                    {cat && (
                      <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-depot-navy/70">
                        {cat.label}
                      </span>
                    )}
                    <span className="mt-0.5 block text-xs leading-snug text-fleet-ink-muted">{n.body}</span>
                    <span className="mt-1.5 block text-[10px] font-medium text-fleet-ink-muted/80">
                      {n.timeLabel}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function NavMessagesPanel({ hub, replyText, setReplyText, onClose }) {
  if (hub.activeMessage) {
    const msg = hub.activeMessage
    return (
      <div className="flex flex-col">
        <div className="border-b border-white/40 p-3">
          <button
            type="button"
            onClick={() => hub.setActiveMessageId(null)}
            className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-depot-navy hover:text-depot-blue-light"
          >
            <Icon name="arrow_back" size={16} />
            Back to inbox
          </button>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-depot-navy text-sm font-bold text-white">
              {initials(msg.from)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-fleet-ink">{msg.from}</p>
              <p className="text-xs text-fleet-ink-muted">{msg.timeLabel}</p>
              <p className="mt-1 text-sm font-semibold text-fleet-ink">{msg.subject}</p>
            </div>
          </div>
        </div>
        <div className="max-h-52 space-y-2 overflow-y-auto p-3">
          <div className="glass-subtle rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-fleet-ink">
            {msg.preview}
          </div>
          {(msg.replies || []).map((r, i) => (
            <div
              key={i}
              className={`rounded-2xl px-4 py-2.5 text-sm ${
                r.from === 'You'
                  ? 'ml-6 bg-depot-blue-light/15 text-fleet-ink'
                  : 'glass-subtle mr-6 text-fleet-ink'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-fleet-ink-muted">{r.from}</span>
              <p className="mt-0.5">{r.text}</p>
            </div>
          ))}
        </div>
        <div className="glass-subtle border-t border-white/50 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="input-field min-w-0 flex-1 py-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && replyText.trim()) {
                  hub.sendQuickReply(msg.id, replyText)
                  setReplyText('')
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                hub.sendQuickReply(msg.id, replyText)
                setReplyText('')
              }}
              className="btn-primary shrink-0 px-3"
            >
              <Icon name="send" size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="glass-subtle mb-3 flex items-center justify-between rounded-xl px-3 py-2.5">
        <span className="text-xs font-medium text-fleet-ink-muted">Depot inbox</span>
        {hub.unreadMessageCount > 0 && (
          <span className="rounded-full bg-depot-blue-light px-2 py-0.5 text-[10px] font-bold text-white">
            {hub.unreadMessageCount} new
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {hub.messages.length === 0 ? (
          <li className="glass-subtle rounded-xl px-4 py-8 text-center">
            <p className="text-sm font-medium text-fleet-ink">No messages</p>
            <p className="mt-1 text-xs text-fleet-ink-muted">
              Depot messages will appear here when available.
            </p>
          </li>
        ) : (
          hub.messages.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => hub.selectMessage(m.id)}
              className={`flex w-full gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                !m.read
                  ? 'glass-subtle border-depot-blue-light/30'
                  : 'border-white/40 bg-white/25 hover:bg-white/40'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  !m.read ? 'bg-depot-navy text-white' : 'bg-white/60 text-fleet-ink-muted'
                }`}
              >
                {initials(m.from)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-fleet-ink">{m.from}</span>
                  <span className="shrink-0 text-[10px] text-fleet-ink-muted">{m.timeLabel}</span>
                </span>
                <span className="block truncate text-xs font-medium text-fleet-ink">{m.subject}</span>
                <span className="block truncate text-xs text-fleet-ink-muted">{m.preview}</span>
              </span>
            </button>
          </li>
        ))
        )}
      </ul>
    </div>
  )
}

export function NavProfilePanel({ onClose, user, onLogout }) {
  const displayName = user?.name || '—'
  const displayEmail = user?.email || '—'
  const depotId = user?.depotId?._id || user?.depotId || '—'
  const depotBranch = user?.depotId?.depotName || user?.depotId?.depotCode || '—'
  return (
    <div>
      <div className="border-b border-white/40 bg-gradient-to-br from-depot-navy/5 to-depot-blue-light/10 p-4">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-fleet-ink">{displayName}</p>
          <p className="truncate text-xs text-fleet-ink-muted">{displayEmail}</p>
          <div className="mt-2 space-y-1 text-xs text-fleet-ink-muted">
            <p>
              <span className="font-semibold text-fleet-ink">Depot ID:</span> {String(depotId)}
            </p>
            <p>
              <span className="font-semibold text-fleet-ink">Depot Branch:</span> {depotBranch}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/40 p-2">
        <button
          type="button"
          onClick={() => {
            onLogout?.()
            onClose()
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50/80"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
            <Icon name="logout" size={20} />
          </span>
          Sign out
        </button>
      </div>
    </div>
  )
}
