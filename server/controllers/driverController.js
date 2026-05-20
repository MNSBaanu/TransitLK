import Driver from '../models/Driver.js'

// @desc    Create a new driver
// @route   POST /api/drivers
// @access  Protected
export const createDriver = async (req, res) => {
  const { name, licenseNo, contactNo, workingHours } = req.body

  try {
    const exists = await Driver.findOne({ licenseNo })
    if (exists) {
      return res.status(400).json({ message: 'Driver with this license number already exists' })
    }

    const driver = await Driver.create({ name, licenseNo, contactNo, workingHours })
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
    const drivers = await Driver.find({}).sort({ createdAt: -1 })
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
