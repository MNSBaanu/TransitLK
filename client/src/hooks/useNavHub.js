import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { detectPeriodConflicts, toDateInputValue } from '../utils/scheduleHelpers'

const MESSAGES_KEY = 'transitlk_nav_messages'
const READ_NOTIFS_KEY = 'transitlk_nav_read_notifications'

const SEED_MESSAGES = [
  {
    id: 'msg-1',
    from: 'Fleet Control',
    subject: 'Bus swap request',
    preview: 'NC-2087 needs replacement before evening peak on Route 138.',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'msg-2',
    from: 'Maintenance Desk',
    subject: 'Service window confirmed',
    preview: 'Workshop slot reserved tomorrow 06:00–09:00 for scheduled inspection.',
    time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'msg-3',
    from: 'Analytics',
    subject: 'Weekly report ready',
    preview: 'Fuel and trip completion summary is available under Analytics.',
    time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
]

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
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

export function useNavHub() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [messages, setMessages] = useState(() => loadJson(MESSAGES_KEY, SEED_MESSAGES))
  const [readNotifIds, setReadNotifIds] = useState(() => loadJson(READ_NOTIFS_KEY, []))
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [activeMessageId, setActiveMessageId] = useState(null)

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(readNotifIds))
  }, [readNotifIds])

  useEffect(() => {
    let cancelled = false

    async function loadAlerts() {
      setLoadingAlerts(true)
      const today = toDateInputValue(new Date())
      const items = []

      try {
        const [busesRes, maintRes, schedRes] = await Promise.all([
          api.get('/buses', { params: { light: 1 } }),
          api.get('/maintenance').catch(() => ({ data: [] })),
          api.get('/schedules', { params: { fromDate: today, toDate: today } }),
        ])

        if (cancelled) return

        const buses = busesRes.data || []
        const maintenance = Array.isArray(maintRes.data) ? maintRes.data : maintRes.data?.records || []
        const schedules = schedRes.data || []

        buses
          .filter((b) => b.status === 'maintenance')
          .forEach((b) => {
            items.push({
              id: `bus-maint-${b._id}`,
              type: 'error',
              title: 'Vehicle offline',
              body: `${b.regNumber} is in maintenance`,
              link: '/buses',
              time: new Date().toISOString(),
            })
          })

        schedules
          .filter((s) => s.status === 'delayed')
          .forEach((s) => {
            items.push({
              id: `sched-delay-${s._id}`,
              type: 'warning',
              title: 'Trip delayed',
              body: `${s.routeId?.routeName || 'Route'} · ${s.departureTime}–${s.arrivalTime}`,
              link: '/schedules',
              time: new Date().toISOString(),
            })
          })

        const conflicts = detectPeriodConflicts(schedules)
        conflicts.slice(0, 5).forEach((c, i) => {
          items.push({
            id: `conflict-${i}-${c.a._id}`,
            type: 'error',
            title: 'Schedule conflict',
            body: c.message,
            link: '/schedules',
            time: new Date().toISOString(),
          })
        })

        maintenance.slice(0, 4).forEach((m) => {
          items.push({
            id: `maint-${m._id}`,
            type: 'info',
            title: 'Maintenance logged',
            body: m.description || 'Service record updated',
            link: '/maintenance',
            time: m.createdAt || m.service_date || new Date().toISOString(),
          })
        })

        if (items.length === 0) {
          items.push({
            id: 'all-clear',
            type: 'info',
            title: 'All clear',
            body: 'No urgent depot alerts for today.',
            link: '/dashboard',
            time: new Date().toISOString(),
          })
        }
      } catch {
        if (!cancelled) {
          items.push({
            id: 'alerts-offline',
            type: 'warning',
            title: 'Alerts unavailable',
            body: 'Could not load live alerts. Check server connection.',
            link: '/dashboard',
            time: new Date().toISOString(),
          })
        }
      }

      if (!cancelled) {
        setNotifications(items)
        setLoadingAlerts(false)
      }
    }

    loadAlerts()
    const interval = setInterval(loadAlerts, 120000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const notificationsWithRead = useMemo(
    () =>
      notifications.map((n) => ({
        ...n,
        read: readNotifIds.includes(n.id),
        timeLabel: formatRelativeTime(n.time),
      })),
    [notifications, readNotifIds]
  )

  const unreadNotifCount = notificationsWithRead.filter((n) => !n.read && n.id !== 'all-clear').length

  const messagesWithMeta = useMemo(
    () =>
      messages.map((m) => ({
        ...m,
        timeLabel: formatRelativeTime(m.time),
      })),
    [messages]
  )

  const unreadMessageCount = messages.filter((m) => !m.read).length

  const activeMessage = messagesWithMeta.find((m) => m.id === activeMessageId) || null

  const markNotificationRead = useCallback((id) => {
    setReadNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setReadNotifIds(notifications.map((n) => n.id))
  }, [notifications])

  const openNotification = useCallback(
    (item) => {
      markNotificationRead(item.id)
      if (item.link) navigate(item.link)
    },
    [markNotificationRead, navigate]
  )

  const markMessageRead = useCallback((id) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)))
  }, [])

  const markAllMessagesRead = useCallback(() => {
    setMessages((prev) => prev.map((m) => ({ ...m, read: true })))
  }, [])

  const selectMessage = useCallback((id) => {
    setActiveMessageId(id)
    markMessageRead(id)
  }, [markMessageRead])

  const sendQuickReply = useCallback((messageId, text) => {
    if (!text.trim()) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              read: true,
              preview: `You: ${text.trim()}`,
              replies: [...(m.replies || []), { from: 'You', text: text.trim(), time: new Date().toISOString() }],
            }
          : m
      )
    )
  }, [])

  return {
    loadingAlerts,
    notifications: notificationsWithRead,
    unreadNotifCount,
    messages: messagesWithMeta,
    unreadMessageCount,
    activeMessage,
    markNotificationRead,
    markAllNotificationsRead,
    openNotification,
    markMessageRead,
    markAllMessagesRead,
    selectMessage,
    sendQuickReply,
    setActiveMessageId,
    formatRelativeTime,
  }
}
