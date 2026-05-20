// Assigned to: Irfa
// Module: Fuel & Maintenance Log

import PageShell from '../components/PageShell'
import Icon from '../components/Icon'

function Maintenance() {
  return (
    <PageShell
      title="Maintenance"
      subtitle="Track fuel consumption and log vehicle maintenance activities."
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="build" className="mb-4 text-outline" size={48} />
        <p className="text-sm text-fleet-ink-muted">Implementation pending — Irfa</p>
      </div>
    </PageShell>
  )
}

export default Maintenance
