import Route from '../models/Route.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'

const busPopulate = { path: 'busId', select: 'regNumber capacity status serviceType mileage' }
const driverPopulate = { path: 'driverId', select: 'name licenseNo contactNo workingHours' }

const populateRoute = (query) =>
  query.populate(busPopulate).populate(driverPopulate).populate('createdBy', 'name email role')

const validateBusAssignment = async (busId) => {
  if (!busId) return null
  const bus = await Bus.findById(busId)
  if (!bus) {
    const error = new Error('Bus not found')
    error.statusCode = 400
    throw error
  }
  if (bus.status !== 'available') {
    const error = new Error(`Bus is not available (current status: ${bus.status})`)
    error.statusCode = 400
    throw error
  }
  return bus
}

const validateDriverAssignment = async (driverId) => {
  if (!driverId) return null
  const driver = await Driver.findById(driverId)
  if (!driver) {
    const error = new Error('Driver not found')
    error.statusCode = 400
    throw error
  }
  return driver
}

// @desc    Get all routes
// @route   GET /api/routes
// @access  Private
export const getRoutes = async (req, res) => {
  try {
    const routes = await populateRoute(Route.find().sort({ createdAt: -1 }))
    res.json(routes)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get single route
// @route   GET /api/routes/:id
// @access  Private
export const getRouteById = async (req, res) => {
  try {
    const route = await populateRoute(Route.findById(req.params.id))
    if (!route) {
      return res.status(404).json({ message: 'Route not found' })
    }
    res.json(route)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Create route
// @route   POST /api/routes
// @access  Private
export const createRoute = async (req, res) => {
  try {
    const { routeName, distance, startPoint, endPoint, busId, driverId } = req.body

    if (!routeName?.trim() || !startPoint?.trim() || !endPoint?.trim()) {
      return res.status(400).json({
        message: 'routeName, startPoint, and endPoint are required',
      })
    }
    if (distance === undefined || distance === null || Number(distance) < 0) {
      return res.status(400).json({ message: 'distance (km) is required and must be >= 0' })
    }

    await validateBusAssignment(busId)
    await validateDriverAssignment(driverId)

    const route = await Route.create({
      ...req.body,
      createdBy: req.user?.id,
    })

    const populated = await populateRoute(Route.findById(route._id))
    res.status(201).json(populated)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

// @desc    Update route
// @route   PUT /api/routes/:id
// @access  Private
export const updateRoute = async (req, res) => {
  try {
    const existing = await Route.findById(req.params.id)
    if (!existing) {
      return res.status(404).json({ message: 'Route not found' })
    }

    if (req.body.busId !== undefined) {
      await validateBusAssignment(req.body.busId)
    }
    if (req.body.driverId !== undefined) {
      await validateDriverAssignment(req.body.driverId)
    }

    const route = await Route.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    const populated = await populateRoute(Route.findById(route._id))
    res.json(populated)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

// @desc    Delete route
// @route   DELETE /api/routes/:id
// @access  Private
export const deleteRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id)
    if (!route) {
      return res.status(404).json({ message: 'Route not found' })
    }
    res.json({ message: 'Route removed', id: route._id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
