import Bus from '../models/Bus.js'
import Maintenance from '../models/Maintenance.js'
import Schedule from '../models/Schedule.js'
import {
  assertFleetResourceNotLinkedToSchedules,
  attachFleetAssignmentContext,
  cancelActiveSchedulesForBus,
} from '../utils/fleetAssignmentHelpers.js'
import {
  computeNextMaintenanceDate,
  ensureMaintenanceRecordForBus,
  recordMaintenanceCompletedForBus,
  syncBusMaintenanceFields,
} from '../utils/busMaintenanceSync.js'
import {
  isSuperadministrator,
  requireUserDepot,
  assertDepotAccess,
  resolveWriteDepotId,
} from '../utils/depotAccess.js'

// @desc    Create a new bus
// @route   POST /api/buses
export const createBus = async (req, res) => {
  const { regNumber, capacity, mileage, status, depotId, serviceType } = req.body

  try {
    const exists = await Bus.findOne({ regNumber })
    if (exists) {
      return res.status(400).json({ message: 'Bus with this registration number already exists' })
    }

    const assignedDepotId = resolveWriteDepotId(req.user, depotId)

    const bus = await Bus.create({
      regNumber,
      capacity,
      mileage,
      status,
      depotId: assignedDepotId,
      serviceType,
    })
    res.status(201).json(bus)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all buses
// @route   GET /api/buses
export const getAllBuses = async (req, res) => {
  try {
    const { status, depotId, light } = req.query
    const isLight = light === '1' || light === 'true'
    const filter = {}
    if (status) filter.status = status
    
    if (depotId) {
      filter.depotId = depotId
    } else if (!isSuperadministrator(req.user)) {
      filter.depotId = requireUserDepot(req.user)
    }

    const buses = await Bus.find(filter)
      .populate('depotId', 'depotName location')
      .sort({ createdAt: -1 })

    if (isLight) {
      return res.json(buses.map((bus) => (bus.toObject ? bus.toObject() : bus)))
    }

    const busIds = buses.map((b) => b._id)
    const latestMaintenanceRows = busIds.length
      ? await Maintenance.aggregate([
          { $match: { bus_id: { $in: busIds } } },
          { $sort: { service_date: -1 } },
          {
            $group: {
              _id: '$bus_id',
              lastMaintenanceDate: { $first: '$service_date' },
            },
          },
        ])
      : []
    const maintenanceByBusId = new Map(
      latestMaintenanceRows.map((row) => [String(row._id), row.lastMaintenanceDate])
    )

    const withAssignments = await attachFleetAssignmentContext(buses, {
      resourceField: 'busId',
    })

    const result = withAssignments.map((doc, index) => {
      const bus = buses[index]
      const busKey = String(bus._id)
      const resolvedLastMaintenance =
        maintenanceByBusId.get(busKey) || bus.lastMaintenanceDate || null
      if (resolvedLastMaintenance) {
        const nextDate = computeNextMaintenanceDate(resolvedLastMaintenance)
        doc.lastMaintenanceDate = resolvedLastMaintenance
        doc.nextMaintenanceDate = nextDate
      } else {
        doc.lastMaintenanceDate = bus.lastMaintenanceDate
        doc.nextMaintenanceDate = bus.nextMaintenanceDate
      }
      return doc
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get a single bus by ID
// @route   GET /api/buses/:id
export const getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' })
    }
    assertDepotAccess(req.user, bus.depotId, 'Not allowed to access buses outside your depot')
    res.json(bus)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update a bus
// @route   PUT /api/buses/:id
export const updateBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' })
    }
    assertDepotAccess(req.user, bus.depotId, 'Not allowed to manage buses outside your depot')

    const updateData = { ...req.body }
    const maintenanceDone =
      updateData.maintenanceDone === true || updateData.maintenanceDone === 'true'
    delete updateData.maintenanceDone

    if (updateData.depotId === '') {
      updateData.depotId = undefined
    } else if (updateData.depotId !== undefined) {
      updateData.depotId = resolveWriteDepotId(req.user, updateData.depotId)
    }

    if (updateData.status === 'maintenance' && bus.status !== 'maintenance') {
      await cancelActiveSchedulesForBus(
        bus._id,
        'Vehicle marked in maintenance — schedule cancelled'
      )
      await ensureMaintenanceRecordForBus(
        bus._id,
        'Vehicle marked in maintenance from fleet'
      )
    }

    const updated = await Bus.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })

    if (maintenanceDone) {
      await recordMaintenanceCompletedForBus(bus._id)
    } else if (updateData.status === 'maintenance' || updateData.status === 'available') {
      await syncBusMaintenanceFields(bus._id)
    }

    const result = maintenanceDone
      ? await Bus.findById(bus._id).populate('depotId', 'depotName location')
      : updated

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Delete a bus
// @route   DELETE /api/buses/:id
export const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' })
    }
    assertDepotAccess(req.user, bus.depotId, 'Not allowed to manage buses outside your depot')

    if (bus.status === 'in-service') {
      return res.status(409).json({
        message: 'Cannot delete bus while it is in service. Complete or remove assigned trips first.',
      })
    }

    await assertFleetResourceNotLinkedToSchedules('busId', bus._id, 'bus')

    await Schedule.deleteMany({ busId: bus._id })
    await Maintenance.deleteMany({ bus_id: bus._id })
    await bus.deleteOne()
    res.json({ message: 'Bus removed successfully' })
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message })
  }
}
