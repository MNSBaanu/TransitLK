import Route from '../models/Route.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import {
  sanitizeRouteBody,
  validateLocation,
  validateStopLocations,
  isWithinWorkingHours,
} from '../utils/routeHelpers.js'
import {
  defaultMinCapacityForService,
  isBusAssignableForRoute,
} from '../utils/fleetHelpers.js'

const busPopulate = { path: 'busId', select: 'regNumber capacity status serviceType mileage' }
const driverPopulate = {
  path: 'driverId',
  select: 'name licenseNo contactNo workingHours status',
}

const populateRoute = (query) =>
  query.populate(busPopulate).populate(driverPopulate).populate('createdBy', 'name email role')

const validateBusAssignment = async (busId, routeServiceType) => {
  if (!busId) return null
  const bus = await Bus.findById(busId)
  if (!bus) {
    const error = new Error('Bus not found')
    error.statusCode = 400
    throw error
  }
  if (!isBusAssignableForRoute(bus, routeServiceType)) {
    const minCap = defaultMinCapacityForService(routeServiceType)
    const error = new Error(
      `Bus does not meet requirements: available status, ${routeServiceType} service type, and capacity ≥ ${minCap}`
    )
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
  if (driver.status && driver.status !== 'available') {
    const error = new Error(`Driver is not available (status: ${driver.status})`)
    error.statusCode = 400
    throw error
  }
  if (!isWithinWorkingHours(driver.workingHours)) {
    const error = new Error(
      `Driver is outside working hours (${driver.workingHours || 'not set'})`
    )
    error.statusCode = 400
    throw error
  }
  return driver
}

const prepareRouteData = (body) => {
  const data = sanitizeRouteBody(body)

  if (data.startLocation) data.startLocation = validateLocation(data.startLocation, 'Start')
  if (data.endLocation) data.endLocation = validateLocation(data.endLocation, 'End')
  if (data.stopLocations) {
    data.stopLocations = validateStopLocations(data.stops || [], data.stopLocations)
  }

  return data
}

// @desc    Get all routes
// @route   GET /api/routes
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
export const createRoute = async (req, res) => {
  try {
    const data = prepareRouteData(req.body)
    const { routeName, distance, startPoint, endPoint, busId, driverId } = data

    if (!routeName?.trim() || !startPoint?.trim() || !endPoint?.trim()) {
      return res.status(400).json({
        message: 'routeName, startPoint, and endPoint are required',
      })
    }
    if (distance === undefined || distance === null || Number(distance) < 0) {
      return res.status(400).json({ message: 'distance (km) is required and must be >= 0' })
    }

    if (busId && !driverId) {
      return res.status(400).json({ message: 'Select a driver when a bus is assigned' })
    }
    if (driverId && !busId) {
      return res.status(400).json({ message: 'Select a bus when a driver is assigned' })
    }

    const serviceType = data.serviceType || 'ordinary'
    await validateBusAssignment(busId, serviceType)
    await validateDriverAssignment(driverId)

    const route = await Route.create({
      ...data,
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
export const updateRoute = async (req, res) => {
  try {
    const existing = await Route.findById(req.params.id)
    if (!existing) {
      return res.status(404).json({ message: 'Route not found' })
    }

    const data = prepareRouteData(req.body)

    const nextBusId = data.busId !== undefined ? data.busId : existing.busId
    const nextDriverId = data.driverId !== undefined ? data.driverId : existing.driverId
    if (nextBusId && !nextDriverId) {
      return res.status(400).json({ message: 'Select a driver when a bus is assigned' })
    }
    if (nextDriverId && !nextBusId) {
      return res.status(400).json({ message: 'Select a bus when a driver is assigned' })
    }

    const serviceType = data.serviceType ?? existing.serviceType ?? 'ordinary'
    if (data.busId !== undefined) await validateBusAssignment(data.busId, serviceType)
    if (data.driverId !== undefined) await validateDriverAssignment(data.driverId)

    await Route.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })

    const populated = await populateRoute(Route.findById(req.params.id))
    res.json(populated)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

// @desc    Delete route
// @route   DELETE /api/routes/:id
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
