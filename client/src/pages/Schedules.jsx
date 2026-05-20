// Assigned to: Baanu
// Module: Schedule Management

import PageShell from '../components/PageShell'
import Icon from '../components/Icon'

function Schedules() {
  return (
    <PageShell
      title="Schedule Management"
      subtitle="Build timetables with automatic conflict and overlap detection."
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="calendar_month" className="mb-4 text-outline" size={48} />
        <p className="text-sm text-on-surface-variant">Implementation pending — Baanu</p>
      </div>
    </PageShell>
  )
}

export default Schedules
