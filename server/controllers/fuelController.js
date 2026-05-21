import FuelLog from '../models/FuelLog.js'
import Bus from '../models/Bus.js'

// @desc    Create a fuel log
// @route   POST /api/fuel
// @access  Protected
export const createFuelLog = async (req, res) => {
  const { bus_id, fuel_date, liters, amount } = req.body

  try {
    const bus = await Bus.findById(bus_id)
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' })
    }

    const fuelLog = await FuelLog.create({ bus_id, fuel_date, liters, amount })
    res.status(201).json(fuelLog)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all fuel logs (filter by bus_id, date range)
// @route   GET /api/fuel
// @access  Protected
export const getAllFuelLogs = async (req, res) => {
  try {
    const { bus_id, from, to } = req.query
    const filter = {}

    if (bus_id) filter.bus_id = bus_id
    if (from || to) {
      filter.fuel_date = {}
      if (from) filter.fuel_date.$gte = new Date(from)
      if (to) filter.fuel_date.$lte = new Date(to)
    }

    const logs = await FuelLog.find(filter).populate('bus_id', 'regNumber').sort({ fuel_date: -1 })
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
    const log = await FuelLog.findById(req.params.id).populate('bus_id', 'regNumber')
    if (!log) {
      return res.status(404).json({ message: 'Fuel log not found' })
    }
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
    const log = await FuelLog.findById(req.params.id)
    if (!log) {
      return res.status(404).json({ message: 'Fuel log not found' })
    }

    const updated = await FuelLog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Delete a fuel log
// @route   DELETE /api/fuel/:id
// @access  Protected
export const deleteFuelLog = async (req, res) => {
  try {
    const log = await FuelLog.findById(req.params.id)
    if (!log) {
      return res.status(404).json({ message: 'Fuel log not found' })
    }

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

    if (bus_id) match.bus_id = bus_id
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
