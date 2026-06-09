import Bus from '../models/Bus.js'
import Maintenance from '../models/Maintenance.js'

export const MAINTENANCE_STATUSES = ['scheduled', 'in-progress', 'completed', 'cancelled']

const ACTIVE_MAINTENANCE_STATUSES = new Set(['scheduled', 'in-progress'])

function parseDateInput(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function computeMaintenanceDuration(record, now = new Date()) {
  const start = parseDateInput(record?.startedAt || record?.service_date)
  if (!start) return null

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

export function sanitizeMaintenanceBody(body = {}, { isUpdate = false } = {}) {
  const data = {}

  if (body.bus_id !== undefined) data.bus_id = body.bus_id
  if (body.service_date !== undefined) data.service_date = body.service_date
  if (body.description !== undefined) data.description = body.description
  if (body.cost !== undefined) data.cost = body.cost

  if (body.status !== undefined) {
    if (!MAINTENANCE_STATUSES.includes(body.status)) {
      const error = new Error('Invalid maintenance status')
      error.statusCode = 400
      throw error
    }
    data.status = body.status
  }

  if (body.startedAt !== undefined) {
    data.startedAt = body.startedAt ? parseDateInput(body.startedAt) : null
  }
  if (body.completedAt !== undefined) {
    data.completedAt = body.completedAt ? parseDateInput(body.completedAt) : null
  }

  const status = data.status
  const startedAt = data.startedAt
  const completedAt = data.completedAt

  if (status === 'completed' && !completedAt && !isUpdate) {
    const error = new Error('Completed maintenance requires a completion date')
    error.statusCode = 400
    throw error
  }

  if (startedAt && completedAt && completedAt < startedAt) {
    const error = new Error('Completion date cannot be before the start date')
    error.statusCode = 400
    throw error
  }

  return data
}

export function finalizeMaintenanceFields(data, existing = null) {
  const status = data.status ?? existing?.status ?? 'in-progress'
  const serviceDate = data.service_date ?? existing?.service_date

  if (!data.status) data.status = status

  if (!data.startedAt && ACTIVE_MAINTENANCE_STATUSES.has(status)) {
    data.startedAt = parseDateInput(serviceDate) || new Date()
  }

  if (status === 'completed' && !data.completedAt) {
    data.completedAt = parseDateInput(serviceDate) || data.startedAt || new Date()
  }

  if (status === 'cancelled') {
    data.completedAt = data.completedAt ?? null
  }

  return data
}

export async function syncBusStatusFromMaintenance(busId) {
  if (!busId) return

  const activeCount = await Maintenance.countDocuments({
    bus_id: busId,
    status: { $in: [...ACTIVE_MAINTENANCE_STATUSES] },
  })

  const bus = await Bus.findById(busId).select('status')
  if (!bus) return

  if (activeCount > 0) {
    if (bus.status !== 'maintenance') {
      await Bus.findByIdAndUpdate(busId, { status: 'maintenance' })
    }
    return
  }

  if (bus.status === 'maintenance') {
    await Bus.findByIdAndUpdate(busId, { status: 'available' })
  }
}

