import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const LEGACY_MESSAGES_KEY = 'transitlk_nav_messages'

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

function mapPriorityToType(priority) {
  switch (priority) {
    case 'critical':
      return 'error'
    case 'high':
      return 'warning'
    case 'medium':
      return 'info'
    case 'low':
      return 'info'
    default:
      return 'info'
  }
}

export function useNavHub() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [messages, setMessages] = useState([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [activeMessageId, setActiveMessageId] = useState(null)

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_MESSAGES_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAlerts() {
      setLoadingAlerts(true)

      try {
        const { data } = await api.get('/notifications')

        if (cancelled) return

        const mappedNotifications = (data || []).map((n) => ({
          id: n._id,
          type: mapPriorityToType(n.priority),
          title: n.title,
          body: n.message,
          link: n.link,
          time: n.createdAt,
          read: n.read,
          data: n.data,
        }))

        setNotifications(mappedNotifications)
        setLoadingAlerts(false)
      } catch {
        if (!cancelled) {
          setNotifications([
            {
              id: 'alerts-offline',
              type: 'warning',
              title: 'Alerts unavailable',
              body: 'Could not load live alerts. Check server connection.',
              link: '/dashboard',
              time: new Date().toISOString(),
              read: false,
            },
          ])
          setLoadingAlerts(false)
        }
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
        timeLabel: formatRelativeTime(n.time),
      })),
    [notifications]
  )

  const unreadNotifCount = notificationsWithRead.filter(
    (n) => !n.read && n.title !== 'All Clear'
  ).length

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

  const markNotificationRead = useCallback(async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [])

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

  const selectMessage = useCallback(
    (id) => {
      setActiveMessageId(id)
      markMessageRead(id)
    },
    [markMessageRead]
  )

  const sendQuickReply = useCallback((messageId, text) => {
    if (!text.trim()) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              read: true,
              preview: `You: ${text.trim()}`,
              replies: [
                ...(m.replies || []),
                { from: 'You', text: text.trim(), time: new Date().toISOString() },
              ],
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
