import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/dashboard',   label: 'Dashboard' },
  { path: '/routes',      label: 'Route Planning' },
  { path: '/schedules',   label: 'Schedules' },
  { path: '/drivers',     label: 'Drivers' },
  { path: '/buses',       label: 'Vehicles' },
  { path: '/maintenance', label: 'Maintenance' },
  { path: '/reports',     label: 'Reports' },
]

function Sidebar() {
  return (
    <aside className="w-60 bg-[#0f2d5e] text-white flex flex-col py-8 px-4 shrink-0">
      <div className="mb-8 px-2">
        <p className="text-white font-semibold text-base tracking-wide">TransitLK</p>
        <p className="text-blue-300 text-xs mt-0.5 tracking-widest uppercase">SRMSS</p>
      </div>
      <p className="text-xs uppercase tracking-widest text-blue-400 mb-3 px-2">
        Main Menu
      </p>
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-3 py-2.5 rounded-md text-sm font-medium transition ${
                isActive
                  ? 'bg-[#1a4a8a] text-white'
                  : 'text-blue-200 hover:bg-[#163d73] hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
