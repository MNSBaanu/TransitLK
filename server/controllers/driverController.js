import Driver from '../models/Driver.js'

// @desc    Create a new driver
// @route   POST /api/drivers
// @access  Protected
export const createDriver = async (req, res) => {
  const { name, license_no, Contact_no, working_hours, depot_id } = req.body

  try {
    const exists = await Driver.findOne({ license_no })
    if (exists) {
      return res.status(400).json({ message: 'Driver with this license number already exists' })
    }

    const driver = await Driver.create({ name, license_no, Contact_no, working_hours, depot_id })
    res.status(201).json(driver)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all drivers
// @route   GET /api/drivers
// @access  Protected
export const getAllDrivers = async (req, res) => {
  try {
    const { depot_id } = req.query
    const filter = depot_id ? { depot_id } : {}
    const drivers = await Driver.find(filter).sort({ createdAt: -1 })
    res.json(drivers)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get a single driver by ID
// @route   GET /api/drivers/:id
// @access  Protected
export const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' })
    }
    res.json(driver)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update a driver
// @route   PUT /api/drivers/:id
// @access  Protected
export const updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' })
    }

    const updated = await Driver.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Delete a driver
// @route   DELETE /api/drivers/:id
// @access  Protected
export const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' })
    }

    await driver.deleteOne()
    res.json({ message: 'Driver removed successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
