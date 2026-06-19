import Bus from '../models/Bus.js'
import Maintenance from '../models/Maintenance.js'
import { syncBusStatusFromMaintenance } from './maintenanceHelpers.js'

export const MAINTENANCE_INTERVAL_DAYS = 28

export function computeNextMaintenanceDate(lastMaintenanceDate) {
  if (!lastMaintenanceDate) return null
  const next = new Date(lastMaintenanceDate)
  next.setDate(next.getDate() + MAINTENANCE_INTERVAL_DAYS)
  return next
}

/** Sync bus last/next maintenance dates from the latest maintenance log */
export async function syncBusMaintenanceFields(busId) {
  if (!busId) return null

  const latest = await Maintenance.findOne({ bus_id: busId })
    .sort({ service_date: -1 })
    .lean()

  if (!latest) return Bus.findById(busId)

  const lastMaintenanceDate = latest.service_date
  const nextMaintenanceDate = computeNextMaintenanceDate(lastMaintenanceDate)

  return Bus.findByIdAndUpdate(
    busId,
    { lastMaintenanceDate, nextMaintenanceDate },
    { new: true }
  )
}

/** Record a completed service from fleet edit and refresh bus maintenance dates */
export async function recordMaintenanceCompletedForBus(
  busId,
  description = 'Routine service completed from fleet'
) {
  if (!busId) return null

  const now = new Date()
  const activeRecord = await Maintenance.findOne({
    bus_id: busId,
    status: { $in: ['scheduled', 'in-progress'] },
  }).sort({ service_date: -1 })

  if (activeRecord) {
    activeRecord.status = 'completed'
    activeRecord.service_date = now
    activeRecord.completedAt = now
    if (!activeRecord.startedAt) activeRecord.startedAt = now
    await activeRecord.save()
  } else {
    await Maintenance.create({
      bus_id: busId,
      service_date: now,
      description,
      cost: 0,
      status: 'completed',
      startedAt: now,
      completedAt: now,
    })
  }

  await syncBusMaintenanceFields(busId)
  await syncBusStatusFromMaintenance(busId)

  return Bus.findById(busId)
}

/** Ensure a maintenance log exists when fleet marks a bus as in maintenance */
export async function ensureMaintenanceRecordForBus(
  busId,
  description = 'Vehicle marked in maintenance from fleet'
) {
  const count = await Maintenance.countDocuments({ bus_id: busId })
  if (count > 0) return null

  const now = new Date()
  return Maintenance.create({
    bus_id: busId,
    service_date: now,
    description,
    cost: 0,
    status: 'in-progress',
    startedAt: now,
  })
}

/** Align fleet status, maintenance logs, and bus maintenance dates on write paths */
export async function reconcileFleetMaintenanceData() {
  const maintenanceBuses = await Bus.find({ status: 'maintenance' }).select('_id').lean()
  await Promise.all(
    maintenanceBuses.map((bus) =>
      ensureMaintenanceRecordForBus(bus._id, 'Vehicle in maintenance (synced from fleet)')
    )
  )

  const latestByBus = await Maintenance.aggregate([
    { $sort: { service_date: -1 } },
    {
      $group: {
        _id: '$bus_id',
        lastMaintenanceDate: { $first: '$service_date' },
      },
    },
  ])

  if (!latestByBus.length) return

  const bulkOps = latestByBus.map((row) => ({
    updateOne: {
      filter: { _id: row._id },
      update: {
        $set: {
          lastMaintenanceDate: row.lastMaintenanceDate,
          nextMaintenanceDate: computeNextMaintenanceDate(row.lastMaintenanceDate),
        },
      },
    },
  }))

  await Bus.bulkWrite(bulkOps, { ordered: false })
}
