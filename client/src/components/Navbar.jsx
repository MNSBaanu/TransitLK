import { useLocation } from 'react-router-dom'
import Icon from './Icon'
import { useLayout } from '../context/LayoutContext'

const AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDMfCMQyea5MKzlWGY1ZKUohvHWFhuFZFG1KyqV0zerTOD3Wpr34zT6cnK1HPQNynynyJbjSLHH5gt24H3wrzkiko1Ets1cHJIbZTanpfT6-iNv2uwRr4aA5Blcq2LrJkPmCX0ZTShfLnsIiEOsmCP5mzv9iUoxDwWd5Cq5bNdrxWxZeEnrsWuRgbJM4itb6nn_eJaQ26eAeVeMhUqTZwmdnsL94pH0qi77pZd_Rw1smHa9KR6tLO213AQznW8jKk15jhtuY2Cbbp4'

function Navbar() {
  const location = useLocation()
  const { routeSearch, setRouteSearch } = useLayout()
  const onRoutesPage = location.pathname === '/routes'
  const hideSearch = ['/buses', '/maintenance'].includes(location.pathname)

  return (
    <header className="z-50 flex h-16 w-full shrink-0 items-center justify-between gap-4 border-b border-outline-variant bg-white px-6">
      <div className="relative min-w-0 flex-1 max-w-xl">
        {!hideSearch && (
          <>
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
            <input
              type="search"
              value={onRoutesPage ? routeSearch : ''}
              onChange={(e) => onRoutesPage && setRouteSearch(e.target.value)}
              disabled={!onRoutesPage}
              placeholder="Search routes..."
              className="w-full rounded-lg border border-outline-variant bg-surface py-2 pl-10 pr-3 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:cursor-default disabled:bg-surface-container-low disabled:opacity-70"
            />
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          aria-label="Notifications"
        >
          <Icon name="notifications" />
        </button>
        <button
          type="button"
          className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          aria-label="Settings"
        >
          <Icon name="settings" />
        </button>
        <button
          type="button"
          className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          aria-label="Help"
        >
          <Icon name="help" />
        </button>
        <div className="ml-1 h-9 w-9 overflow-hidden rounded-full border border-outline-variant bg-surface-container">
          <img src={AVATAR_URL} alt="User avatar" className="h-full w-full object-cover" />
        </div>
      </div>
    </header>
  )
}

export default Navbar
