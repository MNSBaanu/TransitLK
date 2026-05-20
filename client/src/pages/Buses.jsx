// Assigned to: Irfa
// Module: Vehicle Management

import PageShell from '../components/PageShell'
import Icon from '../components/Icon'

function Buses() {
  return (
    <PageShell
      title="Fleet & Drivers"
      subtitle="Manage vehicle registration, capacity, mileage, and service history."
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="directions_bus" className="mb-4 text-outline" size={48} />
        <p className="text-sm text-on-surface-variant">Implementation pending — Irfa</p>
      </div>
    </PageShell>
  )
}

export default Buses
