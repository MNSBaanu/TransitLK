import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'
import PrefetchNavLink from './PrefetchNavLink'
import { useLayout } from '../context/LayoutContext'
import { useNavHub } from '../hooks/useNavHub'
import NavDropdownPanel from './nav/NavDropdownPanel'
import {
  NavMessagesPanel,
  NavNotificationsPanel,
  NavProfilePanel,
} from './nav/NavHubPanels'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS, ROLE_LABELS, homePathForRole } from '../config/roles'
import TransitLKBrand, { getUserDepotCode } from './TransitLKBrand'

const PROFILE_ROLE_BADGES = {
  superadministrator: 'Super Admin',
  administrator: 'Admin',
  transport_scheduler: 'Scheduler',
  fleet_manager: 'Fleet Manager',
  depot_manager: 'Depot Manager',
  driver: 'Driver',
}

function NavBadge({ count }) {
  if (!count) return null
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-depot-blue-light px-1 text-[10px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function Navbar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { routeSearch, setRouteSearch, scheduleSearch, setScheduleSearch } = useLayout()

  const navItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role))
  const hub = useNavHub()
  const profileRoleBadge = user
    ? PROFILE_ROLE_BADGES[user.role] || ROLE_LABELS[user.role] || 'Account'
    : 'Account'

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
    const timer = window.setTimeout(() => setSearchOpen(false), 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  return (
    <header className="top-nav sticky top-0 z-50 shrink-0">
      <div className="relative mx-auto flex h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <NavLink
          to={user ? homePathForRole(user.role) : '/login'}
          className="relative z-10 shrink-0 text-white hover:opacity-90"
        >
          <TransitLKBrand depotCode={getUserDepotCode(user)} variant="nav" />
        </NavLink>

        <nav
          className="absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex"
          aria-label="Main"
        >
          {navItems.map((item) => (
            <PrefetchNavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `top-nav-link rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'top-nav-link-active' : ''
                }`
              }
            >
              {item.label}
            </PrefetchNavLink>
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
              subtitle="Depot alerts & conflicts"
              width="w-[360px]"
              footer={
                <button
                  type="button"
                  onClick={hub.markAllNotificationsRead}
                  className="btn-outlined w-full py-2 text-xs"
                >
                  Mark all as read
                </button>
              }
            >
              <NavNotificationsPanel hub={hub} onClose={closePanel} />
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
              title={hub.activeMessage ? 'Conversation' : 'Messages'}
              subtitle={hub.activeMessage ? hub.activeMessage.subject : 'Depot team inbox'}
              width="w-[380px]"
              footer={
                !hub.activeMessage ? (
                  <button
                    type="button"
                    onClick={hub.markAllMessagesRead}
                    className="btn-outlined w-full py-2 text-xs"
                  >
                    Mark all as read
                  </button>
                ) : null
              }
            >
              <NavMessagesPanel
                hub={hub}
                replyText={replyText}
                setReplyText={setReplyText}
                onClose={closePanel}
              />
            </NavDropdownPanel>
          </div>

          <div className="relative" ref={profileAnchorRef}>
            <button
              type="button"
              onClick={() => togglePanel('profile')}
              className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                openPanel === 'profile'
                  ? 'bg-white text-depot-navy'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
              aria-label="Profile menu"
              aria-expanded={openPanel === 'profile'}
            >
              {profileRoleBadge}
            </button>
            <NavDropdownPanel
              open={openPanel === 'profile'}
              onClose={closePanel}
              anchorRef={profileAnchorRef}
              title="Profile menu"
              hideHeader
              width="w-[320px]"
            >
              <NavProfilePanel
                hub={hub}
                onClose={closePanel}
                user={user}
                onLogout={() => {
                  logout()
                  closePanel()
                  window.location.href = '/login'
                }}
              />
            </NavDropdownPanel>
          </div>
        </div>
      </div>

      <nav className="flex justify-center gap-1 overflow-x-auto border-t border-white/10 bg-[var(--depot-nav-bg-subtle)] px-4 py-2 lg:hidden">
        {navItems.map((item) => (
          <PrefetchNavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-depot-blue-light text-white'
                  : 'bg-white/10 text-white/90 hover:bg-white/15'
              }`
            }
          >
            {item.label}
          </PrefetchNavLink>
        ))}
      </nav>
    </header>
  )
}

export default Navbar
