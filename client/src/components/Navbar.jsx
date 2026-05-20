import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { useLayout } from '../context/LayoutContext'

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

function Navbar() {
  const location = useLocation()
  const { routeSearch, setRouteSearch, scheduleSearch, setScheduleSearch } = useLayout()
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

  return (
    <header className="top-nav sticky top-0 z-50 shrink-0">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-4 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <NavLink
          to="/dashboard"
          className="shrink-0 font-sans text-xl font-bold tracking-tight text-white hover:opacity-90"
        >
          TransitLK
        </NavLink>

        <div className="top-nav-search flex min-w-0 flex-1 items-center rounded-full py-1 pl-4 pr-1 sm:max-w-xl lg:max-w-2xl">
          <input
            type="search"
            value={searchEnabled ? searchValue : ''}
            onChange={handleSearchChange}
            disabled={!searchEnabled}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-default disabled:opacity-50"
          />
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-depot-maroon text-white transition-colors hover:bg-depot-maroon-hover"
            aria-label="Search"
          >
            <Icon name="search" size={20} className="text-white" />
          </button>
        </div>

        <nav className="hidden items-center gap-1 xl:flex">
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NavLink
            to="/schedules"
            className="hidden items-center gap-1.5 rounded-full border border-white/30 bg-depot-maroon px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-depot-maroon-hover sm:inline-flex"
          >
            <Icon name="add" size={18} className="text-white" />
            Assign New Trip
          </NavLink>
          <button
            type="button"
            className="rounded-full p-2 text-white/85 transition-colors hover:bg-white/10"
            aria-label="Notifications"
          >
            <Icon name="notifications" size={22} />
          </button>
          <button
            type="button"
            className="hidden rounded-full p-2 text-white/85 transition-colors hover:bg-white/10 sm:inline-flex"
            aria-label="Messages"
          >
            <Icon name="chat_bubble" size={22} />
          </button>
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-depot-maroon bg-white/10">
            <img src={AVATAR_URL} alt="User" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-white/10 bg-[var(--depot-nav-bg-subtle)] px-4 py-2 xl:hidden">
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
