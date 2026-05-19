// Assigned to: Irfa
// Module: Driver Management

import PageShell from '../components/PageShell'
import Icon from '../components/Icon'

function Drivers() {
  return (
    <PageShell
      title="Driver Management"
      subtitle="Manage driver profiles, license validity, and working hours."
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="badge" className="mb-4 text-outline" size={48} />
        <p className="text-sm text-on-surface-variant">Implementation pending — Irfa</p>
      </div>
    </PageShell>
  )
}

export default Drivers
