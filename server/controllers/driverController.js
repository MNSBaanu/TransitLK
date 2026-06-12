import Driver from '../models/Driver.js'
import {
  assertFleetResourceNotLinkedToSchedules,
  attachFleetAssignmentContext,
} from '../utils/fleetAssignmentHelpers.js'
import { sanitizeWorkingHoursInput } from '../utils/timeFormat.js'
import {
  isSuperadministrator,
  requireUserDepot,
  assertDepotAccess,
  resolveWriteDepotId,
} from '../utils/depotAccess.js'

// @desc    Create a new driver
// @route   POST /api/drivers
export const createDriver = async (req, res) => {
  const { name, licenseNo, email, password, contactNo, workingHours, licenseExpiry, status, depotId } = req.body

  try {
    const exists = await Driver.findOne({ licenseNo })
    if (exists) {
      return res.status(400).json({ message: 'Driver with this license number already exists' })
    }

    if (email) {
      const emailExists = await Driver.findOne({ email: email.toLowerCase() })
      if (emailExists) {
        return res.status(400).json({ message: 'A driver with this email already exists' })
      }
    }

    const assignedDepotId = resolveWriteDepotId(req.user, depotId)

    const driver = new Driver({
      name,
      licenseNo,
      email: email || undefined,
      password: password || undefined,
      contactNo,
      workingHours: sanitizeWorkingHoursInput(workingHours),
      licenseExpiry: licenseExpiry || undefined,
      status,
      depotId: assignedDepotId,
    })
    await driver.save()
    res.status(201).json(driver)
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message })
  }
}

// @desc    Get all drivers
// @route   GET /api/drivers
export const getAllDrivers = async (req, res) => {
  try {
    const { depotId, light } = req.query
    const isLight = light === '1' || light === 'true'
    const filter = {}
    
    if (depotId) {
      filter.depotId = depotId
    } else if (!isSuperadministrator(req.user)) {
      filter.depotId = requireUserDepot(req.user)
    }

    const drivers = await Driver.find(filter)
      .populate('depotId', 'depotName location')
      .sort({ createdAt: -1 })

    if (isLight) {
      return res.json(drivers.map((driver) => (driver.toObject ? driver.toObject() : driver)))
    }

    const result = await attachFleetAssignmentContext(drivers, {
      resourceField: 'driverId',
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get a single driver by ID
// @route   GET /api/drivers/:id
export const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' })
    }
    assertDepotAccess(req.user, driver.depotId, 'Not allowed to access drivers outside your depot')
    res.json(driver)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update a driver
// @route   PUT /api/drivers/:id
export const updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' })
    }
    assertDepotAccess(req.user, driver.depotId, 'Not allowed to manage drivers outside your depot')

    const updates = { ...req.body }
    if (Object.prototype.hasOwnProperty.call(updates, 'workingHours')) {
      updates.workingHours = sanitizeWorkingHoursInput(updates.workingHours)
    }
    if (updates.depotId === '') {
      updates.depotId = undefined
    } else if (updates.depotId !== undefined) {
      updates.depotId = resolveWriteDepotId(req.user, updates.depotId)
    }

    const updated = await Driver.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
    res.json(updated)
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message })
  }
}

// @desc    Delete a driver
// @route   DELETE /api/drivers/:id
export const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' })
    }
    assertDepotAccess(req.user, driver.depotId, 'Not allowed to manage drivers outside your depot')

    await assertFleetResourceNotLinkedToSchedules('driverId', driver._id, 'driver')

    await driver.deleteOne()
    res.json({ message: 'Driver removed successfully' })
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message })
  }
}
