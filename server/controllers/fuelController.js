import FuelLog from '../models/FuelLog.js'
import Bus from '../models/Bus.js'
import {
  controllerErrorMessage,
  controllerErrorStatus,
  resolveBusReference,
} from '../utils/busLookup.js'
import {
  isSuperadministrator,
  requireUserDepot,
  assertDepotAccess,
} from '../utils/depotAccess.js'

// @desc    Create a fuel log
// @route   POST /api/fuel
// @access  Protected
export const createFuelLog = async (req, res) => {
  const { bus_id, fuel_date, liters, amount } = req.body

  try {
    const bus = await resolveBusReference(bus_id)
    assertDepotAccess(req.user, bus.depotId, 'Not allowed to log fuel for buses outside your depot')

    const fuelLog = await FuelLog.create({ bus_id: bus._id, fuel_date, liters, amount })
    res.status(201).json(fuelLog)
  } catch (error) {
    res.status(controllerErrorStatus(error)).json({ message: controllerErrorMessage(error) })
  }
}

// @desc    Get all fuel logs (filter by bus_id, date range)
// @route   GET /api/fuel
// @access  Protected
export const getAllFuelLogs = async (req, res) => {
  try {
    const { bus_id, from, to } = req.query
    const filter = {}

    if (bus_id) {
      const bus = await Bus.findById(bus_id)
      if (!bus) {
        return res.status(404).json({ message: 'Bus not found' })
      }
      assertDepotAccess(req.user, bus.depotId, 'Not allowed to view fuel logs for buses outside your depot')
      filter.bus_id = bus_id
    } else if (!isSuperadministrator(req.user)) {
      const userDepotId = requireUserDepot(req.user)
      const buses = await Bus.find({ depotId: userDepotId }).select('_id')
      filter.bus_id = { $in: buses.map((b) => b._id) }
    }

    if (from || to) {
      filter.fuel_date = {}
      if (from) filter.fuel_date.$gte = new Date(from)
      if (to) filter.fuel_date.$lte = new Date(to)
    }

    const logs = await FuelLog.find(filter).populate('bus_id', 'regNumber').sort({ liters: -1, amount: -1 })
    res.json(logs)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get a single fuel log by ID
// @route   GET /api/fuel/:id
// @access  Protected
export const getFuelLogById = async (req, res) => {
  try {
    const log = await FuelLog.findById(req.params.id).populate('bus_id', 'regNumber depotId')
    if (!log) {
      return res.status(404).json({ message: 'Fuel log not found' })
    }
    assertDepotAccess(req.user, log.bus_id?.depotId, 'Not allowed to access fuel logs outside your depot')
    res.json(log)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update a fuel log
// @route   PUT /api/fuel/:id
// @access  Protected
export const updateFuelLog = async (req, res) => {
  try {
    const log = await FuelLog.findById(req.params.id).populate('bus_id', 'regNumber depotId')
    if (!log) {
      return res.status(404).json({ message: 'Fuel log not found' })
    }
    assertDepotAccess(req.user, log.bus_id?.depotId, 'Not allowed to manage fuel logs outside your depot')

    if (req.body.bus_id && String(req.body.bus_id) !== String(log.bus_id?._id)) {
      const newBus = await resolveBusReference(req.body.bus_id)
      assertDepotAccess(req.user, newBus.depotId, 'Not allowed to assign fuel logs to a bus outside your depot')
      req.body.bus_id = newBus._id
    }

    const updated = await FuelLog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    res.json(updated)
  } catch (error) {
    res.status(controllerErrorStatus(error)).json({ message: controllerErrorMessage(error) })
  }
}

// @desc    Delete a fuel log
// @route   DELETE /api/fuel/:id
// @access  Protected
export const deleteFuelLog = async (req, res) => {
  try {
    const log = await FuelLog.findById(req.params.id).populate('bus_id', 'regNumber depotId')
    if (!log) {
      return res.status(404).json({ message: 'Fuel log not found' })
    }
    assertDepotAccess(req.user, log.bus_id?.depotId, 'Not allowed to manage fuel logs outside your depot')

    await log.deleteOne()
    res.json({ message: 'Fuel log removed successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get total fuel cost summary (optionally filtered by bus_id or date range)
// @route   GET /api/fuel/summary
// @access  Protected
export const getFuelSummary = async (req, res) => {
  try {
    const { bus_id, from, to } = req.query
    const match = {}

    if (bus_id) {
      const bus = await Bus.findById(bus_id)
      if (!bus) {
        return res.status(404).json({ message: 'Bus not found' })
      }
      assertDepotAccess(req.user, bus.depotId, 'Not allowed to view fuel summary for buses outside your depot')
      match.bus_id = bus_id
    } else if (!isSuperadministrator(req.user)) {
      const userDepotId = requireUserDepot(req.user)
      const buses = await Bus.find({ depotId: userDepotId }).select('_id')
      match.bus_id = { $in: buses.map((b) => b._id) }
    }

    if (from || to) {
      match.fuel_date = {}
      if (from) match.fuel_date.$gte = new Date(from)
      if (to) match.fuel_date.$lte = new Date(to)
    }

    const summary = await FuelLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalLiters: { $sum: '$liters' },
          totalAmount: { $sum: '$amount' },
          totalEntries: { $count: {} },
        },
      },
    ])

    res.json(summary[0] || { totalLiters: 0, totalAmount: 0, totalEntries: 0 })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
