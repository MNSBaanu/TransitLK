import { Users } from 'lucide-react'
import { ROLE_LABELS, ROLES } from '../../config/roles'

const PORTAL_ROLES = [
  ROLES.SUPERADMINISTRATOR,
  ROLES.ADMINISTRATOR,
  ROLES.TRANSPORT_SCHEDULER,
  ROLES.FLEET_MANAGER,
  ROLES.DEPOT_MANAGER,
  ROLES.DRIVER,
]

function Roles() {
  return (
    <section id="roles" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl font-bold text-depot-navy">Built for every role</h2>
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
        {PORTAL_ROLES.map((role) => (
          <div
            key={role}
            className="group flex flex-col items-center gap-3 rounded-3xl border border-outline-variant bg-white p-6 text-center transition duration-300 hover:-translate-y-1 hover:border-depot-blue-muted hover:shadow-elevated"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-depot-navy to-depot-blue-light text-white shadow-card transition duration-300 group-hover:scale-110">
              <Users size={24} />
            </span>
            <span className="font-semibold text-depot-navy">{ROLE_LABELS[role]}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Roles
