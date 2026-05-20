import { NavLink, useNavigate } from 'react-router-dom'
import Icon from './Icon'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/routes', label: 'Route Management', icon: 'map' },
  { path: '/schedules', label: 'Schedules', icon: 'calendar_month' },
  { path: '/buses', label: 'Fleet & Drivers', icon: 'directions_bus' },
  { path: '/maintenance', label: 'Maintenance', icon: 'build' },
  { path: '/reports', label: 'Analytics', icon: 'assessment' },
]

function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-outline-variant bg-white px-2 py-4">
      <div className="mb-6 px-4">
        <h1 className="text-lg font-bold tracking-tight text-neutral-900">TransitLK</h1>
      </div>

      <nav className="flex-1 space-y-1 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-secondary hover:bg-surface-container'
              }`
            }
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3 px-4 pb-2">
        <button
          type="button"
          onClick={() => navigate('/schedules')}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          <Icon name="add" size={20} />
          Assign New Trip
        </button>
        <div className="border-t border-outline-variant pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-secondary hover:bg-surface-container"
          >
            <Icon name="logout" size={20} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
