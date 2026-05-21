import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { useLayout } from '../context/LayoutContext'
import { useNavHub } from '../hooks/useNavHub'
import NavDropdownPanel from './nav/NavDropdownPanel'

const AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDMfCMQyea5MKzlWGY1ZKUohvHWFhuFZFG1KyqV0zerTOD3Wpr34zT6cnK1HPQNynynyJbjSLHH5gt24H3wrzkiko1Ets1cHJIbZTanpfT6-iNv2uwRr4aA5Blcq2LrJkPmCX0ZTShfLnsIiEOsmCP5mzv9iUoxDwWd5Cq5bNdrxWxZeEnrsWuRgbJM4itb6nn_eJaQ26eAeVeMhUqTZwmdnsL94pH0qi77pZd_Rw1smHa9KR6tLO213AQznW8jKk15jhtuY2Cbbp4'

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/routes', label: 'Routes' },
  { path: '/schedules', label: 'Schedules' },
  { path: '/buses', label: 'Fleet' },
  { path: '/maintenance', label: 'Maintenance' },
  { path: '/reports', label: 'Analytics' },
]

const notifIcon = {
  error: 'error',
  warning: 'warning',
  info: 'info',
}

function NavBadge({ count }) {
  if (!count) return null
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-depot-maroon px-1 text-[10px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function Navbar() {
  const location = useLocation()
  const { routeSearch, setRouteSearch, scheduleSearch, setScheduleSearch } = useLayout()
  const hub = useNavHub()

  const [openPanel, setOpenPanel] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const notifAnchorRef = useRef(null)
  const messagesAnchorRef = useRef(null)
  const profileAnchorRef = useRef(null)
  const searchAnchorRef = useRef(null)
  const searchInputRef = useRef(null)

  const onRoutesPage = location.pathname === '/routes'
  const onSchedulesPage = location.pathname === '/schedules'
  const searchEnabled = onRoutesPage || onSchedulesPage
  const searchValue = onRoutesPage ? routeSearch : onSchedulesPage ? scheduleSearch : ''
  const searchPlaceholder = onSchedulesPage
    ? 'Search schedules, drivers...'
    : onRoutesPage
      ? 'Search routes...'
      : 'Search depot records...'

  const handleSearchChange = (e) => {
    const v = e.target.value
    if (onRoutesPage) setRouteSearch(v)
    if (onSchedulesPage) setScheduleSearch(v)
  }

  const togglePanel = (panel) => {
    setSearchOpen(false)
    setOpenPanel((prev) => (prev === panel ? null : panel))
    if (panel !== 'messages') {
      hub.setActiveMessageId(null)
      setReplyText('')
    }
  }

  const closePanel = () => {
    setOpenPanel(null)
    hub.setActiveMessageId(null)
    setReplyText('')
  }

  const toggleSearch = () => {
    setOpenPanel(null)
    hub.setActiveMessageId(null)
    setReplyText('')
    setSearchOpen((prev) => !prev)
  }

  useEffect(() => {
    if (!searchOpen) return
    searchInputRef.current?.focus()
    const onDocClick = (e) => {
      if (searchAnchorRef.current?.contains(e.target)) return
      setSearchOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [searchOpen])

  useEffect(() => {
    setSearchOpen(false)
  }, [location.pathname])

  return (
    <header className="top-nav sticky top-0 z-50 shrink-0">
      <div className="relative mx-auto flex h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <NavLink
          to="/dashboard"
          className="relative z-10 shrink-0 font-sans text-lg font-bold tracking-tight text-white hover:opacity-90 sm:text-xl"
        >
          TransitLK
        </NavLink>

        <nav
          className="absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex"
          aria-label="Main"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `top-nav-link rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'top-nav-link-active' : ''
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <div ref={searchAnchorRef} className="flex items-center">
            <div
              className={`top-nav-search flex h-9 items-center overflow-hidden rounded-full transition-all duration-300 ease-out ${
                searchOpen
                  ? 'mr-1 w-44 border pl-3 pr-1 opacity-100 sm:w-56 md:w-64'
                  : 'mr-0 w-0 border-0 pl-0 pr-0 opacity-0'
              }`}
            >
              <input
                ref={searchInputRef}
                type="search"
                value={searchEnabled ? searchValue : ''}
                onChange={handleSearchChange}
                disabled={!searchEnabled}
                placeholder={searchPlaceholder}
                tabIndex={searchOpen ? 0 : -1}
                className="min-w-0 w-full bg-transparent text-sm outline-none disabled:cursor-default disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={toggleSearch}
              className={`rounded-full p-2 transition-colors ${
                searchOpen ? 'bg-white/20 text-white' : 'text-white/85 hover:bg-white/10'
              }`}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              aria-expanded={searchOpen}
            >
              <Icon name="search" size={22} />
            </button>
          </div>

          <div className="relative" ref={notifAnchorRef}>
            <button
              type="button"
              onClick={() => togglePanel('notifications')}
              className={`relative rounded-full p-2 transition-colors ${
                openPanel === 'notifications'
                  ? 'bg-white/20 text-white'
                  : 'text-white/85 hover:bg-white/10'
              }`}
              aria-label="Notifications"
              aria-expanded={openPanel === 'notifications'}
            >
              <Icon name="notifications" size={22} />
              <NavBadge count={hub.unreadNotifCount} />
            </button>
            <NavDropdownPanel
              open={openPanel === 'notifications'}
              onClose={closePanel}
              anchorRef={notifAnchorRef}
              title="Notifications"
              footer={
                <button
                  type="button"
                  onClick={hub.markAllNotificationsRead}
                  className="w-full rounded-lg py-1.5 text-xs font-semibold text-[#000249] hover:bg-white"
                >
                  Mark all as read
                </button>
              }
            >
              {hub.loadingAlerts ? (
                <p className="px-4 py-6 text-center text-sm text-on-surface-variant">Loading alerts...</p>
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {hub.notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          hub.openNotification(n)
                          closePanel()
                        }}
                        className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container/60 ${
                          n.read ? 'opacity-70' : 'bg-surface-container/30'
                        }`}
                      >
                        <Icon
                          name={notifIcon[n.type] || 'notifications'}
                          size={20}
                          className={
                            n.type === 'error'
                              ? 'shrink-0 text-red-600'
                              : n.type === 'warning'
                                ? 'shrink-0 text-amber-600'
                                : 'shrink-0 text-[#000249]'
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-neutral-900">{n.title}</span>
                          <span className="block text-xs text-on-surface-variant">{n.body}</span>
                          <span className="mt-1 block text-[10px] text-on-surface-variant">{n.timeLabel}</span>
                        </span>
                        {!n.read && n.id !== 'all-clear' ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-depot-maroon" />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </NavDropdownPanel>
          </div>

          <div className="relative" ref={messagesAnchorRef}>
            <button
              type="button"
              onClick={() => togglePanel('messages')}
              className={`relative rounded-full p-2 transition-colors ${
                openPanel === 'messages' ? 'bg-white/20 text-white' : 'text-white/85 hover:bg-white/10'
              }`}
              aria-label="Messages"
              aria-expanded={openPanel === 'messages'}
            >
              <Icon name="chat_bubble" size={22} />
              <NavBadge count={hub.unreadMessageCount} />
            </button>
            <NavDropdownPanel
              open={openPanel === 'messages'}
              onClose={closePanel}
              anchorRef={messagesAnchorRef}
              title={hub.activeMessage ? 'Message' : 'Messages'}
              width="w-[340px]"
            >
              {hub.activeMessage ? (
                <div className="p-4">
                  <button
                    type="button"
                    onClick={() => hub.setActiveMessageId(null)}
                    className="mb-3 flex items-center gap-1 text-xs font-semibold text-[#000249] hover:underline"
                  >
                    <Icon name="arrow_back" size={16} />
                    Back to inbox
                  </button>
                  <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">From</p>
                  <p className="text-sm font-semibold text-neutral-900">{hub.activeMessage.from}</p>
                  <p className="mt-2 text-sm font-bold text-neutral-900">{hub.activeMessage.subject}</p>
                  <p className="mt-2 text-sm text-on-surface-variant">{hub.activeMessage.preview}</p>
                  {(hub.activeMessage.replies || []).map((r, i) => (
                    <p key={i} className="mt-2 rounded-lg bg-surface-container px-3 py-2 text-sm text-neutral-800">
                      <span className="font-semibold">{r.from}: </span>
                      {r.text}
                    </p>
                  ))}
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Quick reply..."
                      className="min-w-0 flex-1 rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-[#000249]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          hub.sendQuickReply(hub.activeMessage.id, replyText)
                          setReplyText('')
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        hub.sendQuickReply(hub.activeMessage.id, replyText)
                        setReplyText('')
                      }}
                      className="rounded-lg bg-depot-maroon px-3 py-2 text-sm font-semibold text-white hover:bg-depot-maroon-hover"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-outline-variant">
                    {hub.messages.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => hub.selectMessage(m.id)}
                          className={`flex w-full flex-col px-4 py-3 text-left hover:bg-surface-container/60 ${
                            m.read ? 'opacity-75' : 'bg-surface-container/30'
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-neutral-900">{m.from}</span>
                            <span className="text-[10px] text-on-surface-variant">{m.timeLabel}</span>
                          </span>
                          <span className="text-xs font-semibold text-neutral-800">{m.subject}</span>
                          <span className="truncate text-xs text-on-surface-variant">{m.preview}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-outline-variant px-3 py-2">
                    <button
                      type="button"
                      onClick={hub.markAllMessagesRead}
                      className="w-full rounded-lg py-1.5 text-xs font-semibold text-[#000249] hover:bg-white"
                    >
                      Mark all as read
                    </button>
                  </div>
                </>
              )}
            </NavDropdownPanel>
          </div>

          <div className="relative" ref={profileAnchorRef}>
            <button
              type="button"
              onClick={() => togglePanel('profile')}
              className={`h-10 w-10 overflow-hidden rounded-full border-2 transition-colors ${
                openPanel === 'profile' ? 'border-white' : 'border-depot-maroon'
              }`}
              aria-label="Profile menu"
              aria-expanded={openPanel === 'profile'}
            >
              <img src={AVATAR_URL} alt="" className="h-full w-full object-cover" />
            </button>
            <NavDropdownPanel
              open={openPanel === 'profile'}
              onClose={closePanel}
              anchorRef={profileAnchorRef}
              title="Profile"
              width="w-72"
            >
              <div className="border-b border-outline-variant px-4 py-4">
                <div className="flex items-center gap-3">
                  <img
                    src={AVATAR_URL}
                    alt=""
                    className="h-12 w-12 rounded-full border-2 border-depot-maroon object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-neutral-900">{hub.profile.name}</p>
                    <p className="truncate text-xs text-on-surface-variant">{hub.profile.role}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 px-4 py-3">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                    Display name
                  </span>
                  <input
                    type="text"
                    value={hub.profile.name}
                    onChange={(e) => hub.updateProfileField('name', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-[#000249]"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                    Email
                  </span>
                  <input
                    type="email"
                    value={hub.profile.email}
                    onChange={(e) => hub.updateProfileField('email', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-[#000249]"
                  />
                </label>
                <p className="text-xs text-on-surface-variant">
                  <span className="font-semibold text-neutral-800">Depot: </span>
                  {hub.profile.depot}
                </p>
              </div>
              <ul className="border-t border-outline-variant py-1">
                {[
                  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
                  { path: '/routes', label: 'My routes', icon: 'route' },
                  { path: '/schedules', label: 'Schedules', icon: 'event' },
                  { path: '/reports', label: 'Analytics', icon: 'analytics' },
                ].map((link) => (
                  <li key={link.path}>
                    <NavLink
                      to={link.path}
                      onClick={closePanel}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-surface-container/60"
                    >
                      <Icon name={link.icon} size={18} className="text-[#000249]" />
                      {link.label}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      hub.signOut()
                      closePanel()
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-depot-maroon hover:bg-red-50"
                  >
                    <Icon name="logout" size={18} />
                    Sign out
                  </button>
                </li>
              </ul>
            </NavDropdownPanel>
          </div>
        </div>
      </div>

      <nav className="flex justify-center gap-1 overflow-x-auto border-t border-white/10 bg-[var(--depot-nav-bg-subtle)] px-4 py-2 lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-depot-maroon text-white'
                  : 'bg-white/10 text-white/90 hover:bg-white/15'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

export default Navbar
