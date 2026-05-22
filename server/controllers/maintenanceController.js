import Maintenance from '../models/Maintenance.js'
import Bus from '../models/Bus.js'

// @desc    Create a maintenance record
// @route   POST /api/maintenance
// @access  Protected
export const createMaintenance = async (req, res) => {
  const { bus_id, service_date, description, cost } = req.body

  try {
    const bus = await Bus.findById(bus_id)
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' })
    }

    const record = await Maintenance.create({ bus_id, service_date, description, cost })

    // Update bus status to in maintenance
    await Bus.findByIdAndUpdate(bus_id, { status: 'maintenance' })

    res.status(201).json(record)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all maintenance records (filter by bus_id, date range)
// @route   GET /api/maintenance
// @access  Protected
export const getAllMaintenance = async (req, res) => {
  try {
    const { bus_id, from, to } = req.query
    const filter = {}

    if (bus_id) filter.bus_id = bus_id
    if (from || to) {
      filter.service_date = {}
      if (from) filter.service_date.$gte = new Date(from)
      if (to) filter.service_date.$lte = new Date(to)
    }

    const records = await Maintenance.find(filter)
      .populate('bus_id', 'regNumber status')
      .sort({ service_date: -1 })
    res.json(records)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get a single maintenance record by ID
// @route   GET /api/maintenance/:id
// @access  Protected
export const getMaintenanceById = async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id).populate('bus_id', 'regNumber status')
    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' })
    }
    res.json(record)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update a maintenance record
// @route   PUT /api/maintenance/:id
// @access  Protected
export const updateMaintenance = async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id)
    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' })
    }

    const updated = await Maintenance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Delete a maintenance record
// @route   DELETE /api/maintenance/:id
// @access  Protected
export const deleteMaintenance = async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id)
    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' })
    }

    await record.deleteOne()
    res.json({ message: 'Maintenance record removed successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
