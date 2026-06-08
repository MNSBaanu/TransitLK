import Bus from '../models/Bus.js'
import Maintenance from '../models/Maintenance.js'

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

/** Ensure a maintenance log exists when fleet marks a bus as in maintenance */
export async function ensureMaintenanceRecordForBus(
  busId,
  description = 'Vehicle marked in maintenance from fleet'
) {
  const count = await Maintenance.countDocuments({ bus_id: busId })
  if (count > 0) return null

  return Maintenance.create({
    bus_id: busId,
    service_date: new Date(),
    description,
    cost: 0,
  })
}

/** Align fleet status, maintenance logs, and bus maintenance dates */
export async function reconcileFleetMaintenanceData() {
  const maintenanceBuses = await Bus.find({ status: 'maintenance' }).select('_id')
  for (const bus of maintenanceBuses) {
    await ensureMaintenanceRecordForBus(
      bus._id,
      'Vehicle in maintenance (synced from fleet)'
    )
    await syncBusMaintenanceFields(bus._id)
  }

  const busIdsWithRecords = await Maintenance.distinct('bus_id')
  for (const busId of busIdsWithRecords) {
    await syncBusMaintenanceFields(busId)
  }
}
