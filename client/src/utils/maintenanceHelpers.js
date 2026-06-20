export const MAINTENANCE_STATUSES = ['scheduled', 'in-progress', 'completed', 'cancelled']

export const MAINTENANCE_STATUS_LABELS = {
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const MAINTENANCE_STATUS_STYLES = {
  scheduled: 'bg-amber-100 text-amber-800',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-neutral-100 text-neutral-600',
}

const ACTIVE_MAINTENANCE_STATUSES = new Set(['scheduled', 'in-progress'])

function parseDateInput(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatMaintenanceStatus(status) {
  return MAINTENANCE_STATUS_LABELS[status] || '—'
}

export function maintenanceStatusClass(status) {
  return MAINTENANCE_STATUS_STYLES[status] || MAINTENANCE_STATUS_STYLES.cancelled
}

export function computeMaintenanceDuration(record, now = new Date()) {
  const start = parseDateInput(record?.startedAt || record?.service_date)
  if (!start) return '—'

  const end =
    record?.status === 'completed'
      ? parseDateInput(record.completedAt) || start
      : ACTIVE_MAINTENANCE_STATUSES.has(record?.status)
        ? now
        : parseDateInput(record.completedAt) || start

  const diffMs = Math.max(0, end.getTime() - start.getTime())
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`
  return '< 1 hour'
}

export function maintenanceLogDate(record) {
  const dates = [record?.service_date, record?.startedAt, record?.completedAt]
    .map(parseDateInput)
    .filter(Boolean)
  if (!dates.length) return null
  return dates.reduce((latest, d) => (d > latest ? d : latest), dates[0])
}

export function maintenanceFormState(record, preSelectedBusId) {
  if (record) {
    return {
      bus_id: record.bus_id?._id || record.bus_id || '',
      service_date: record.service_date?.slice(0, 10) || '',
      description: record.description || '',
      cost: record.cost ?? '',
      status: record.status || 'completed',
      startedAt: record.startedAt?.slice(0, 10) || record.service_date?.slice(0, 10) || '',
      completedAt: record.completedAt?.slice(0, 10) || '',
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  return {
    bus_id: preSelectedBusId || '',
    service_date: today,
    description: '',
    cost: '',
    status: 'in-progress',
    startedAt: today,
    completedAt: '',
  }
}
