// Module: Reporting & Analytics (pending — group)

import PageShell from '../components/PageShell'
import Icon from '../components/Icon'

function Reports() {
  return (
    <PageShell
      title="Analytics"
      subtitle="Export PDF reports on trips, route performance, and fuel trends."
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="assessment" className="mb-4 text-outline" size={48} />
        <p className="text-sm text-on-surface-variant">Implementation pending</p>
      </div>
    </PageShell>
  )
}

export default Reports
