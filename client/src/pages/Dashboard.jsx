// Module: Depot Management Dashboard (pending — group)

import PageShell from '../components/PageShell'
import Icon from '../components/Icon'

function Dashboard() {
  return (
    <PageShell
      title="Depot Dashboard"
      subtitle="Overview of active routes, buses, drivers, and trip statuses."
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="dashboard" className="mb-4 text-outline" size={48} />
        <p className="text-sm text-on-surface-variant">Implementation pending — group module</p>
      </div>
    </PageShell>
  )
}

export default Dashboard
