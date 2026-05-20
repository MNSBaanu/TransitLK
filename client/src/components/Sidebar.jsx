import { NavLink } from 'react-router-dom'
import Icon from './Icon'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/routes', label: 'Route Management', icon: 'map' },
  { path: '/schedules', label: 'Schedules', icon: 'calendar_month' },
  { path: '/buses', label: 'Fleet', icon: 'directions_bus' },
  { path: '/maintenance', label: 'Maintenance', icon: 'build' },
  { path: '/reports', label: 'Analytics', icon: 'assessment' },
]

function Sidebar() {
  return (
    <aside
      className="flex h-screen w-64 shrink-0 flex-col border-r border-[#3d4246] px-2 py-4"
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
    >
      <div className="mb-6 px-4">
        <h1 className="text-lg font-bold tracking-tight text-[var(--sidebar-text)]">TransitLK</h1>
        <p className="mt-0.5 text-xs text-[var(--sidebar-text-muted)]">SRMSS Depot</p>
      </div>

      <nav className="flex-1 space-y-1 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'sidebar-nav-active'
                  : 'text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
              }`
            }
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4 pb-2 pt-3">
        <NavLink
          to="/schedules"
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          <Icon name="add" size={20} />
          Assign New Trip
        </NavLink>
      </div>
    </aside>
  )
}

export default Sidebar
