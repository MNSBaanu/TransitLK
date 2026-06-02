import Route from '../models/Route.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import Schedule from '../models/Schedule.js'
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
import {
  assertDepotAccess,
  isSuperadministrator,
  requireUserDepot,
  resolveWriteDepotId,
} from '../utils/depotAccess.js'

const busPopulate = { path: 'busId', select: 'regNumber capacity status serviceType mileage' }
const driverPopulate = {
  path: 'driverId',
  select: 'name licenseNo contactNo workingHours status',
}
const depotPopulate = { path: 'depotId', select: 'depotCode depotName region location' }
const PAGE_SIZE_OPTIONS = new Set([10, 15])

const populateRoute = (query) =>
  query
    .populate(busPopulate)
    .populate(driverPopulate)
    .populate(depotPopulate)
    .populate('createdBy', 'name email role')

const sortRoutes = (query) =>
  query.sort({ routeNo: 1, createdAt: 1 }).collation({ locale: 'en', numericOrdering: true })

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildRouteFilter = (req, search = '') => {
  const filter = {}
  if (!isSuperadministrator(req.user)) {
    filter.depotId = requireUserDepot(req.user)
  }

  const trimmedSearch = search.trim()
  if (trimmedSearch) {
    const regex = new RegExp(escapeRegex(trimmedSearch), 'i')
    filter.$or = [
      { routeNo: regex },
      { routeName: regex },
      { startPoint: regex },
      { endPoint: regex },
      { viaDescription: regex },
      { stops: regex },
    ]
  }

  return filter
}

const validateBusAssignment = async (busId, routeServiceType, routeDepotId) => {
  if (!busId) return null
  const bus = await Bus.findById(busId)
  if (!bus) {
    const error = new Error('Bus not found')
    error.statusCode = 400
    throw error
  }
  if (!isBusAssignableForRoute(bus, routeServiceType)) {
    const minCap = defaultMinCapacityForService(routeServiceType)
    const error = new Error(`Bus does not meet requirements: available status and capacity ≥ ${minCap}`)
    error.statusCode = 400
    throw error
  }
  if (routeDepotId && bus.depotId && String(bus.depotId) !== String(routeDepotId)) {
    const error = new Error('Bus belongs to a different depot')
    error.statusCode = 400
    throw error
  }
  return bus
}

const validateDriverAssignment = async (driverId, routeDepotId) => {
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
  if (routeDepotId && driver.depotId && String(driver.depotId) !== String(routeDepotId)) {
    const error = new Error('Driver belongs to a different depot')
    error.statusCode = 400
    throw error
  }
  return driver
}

const syncAssignedBusServiceType = async (busId, serviceType) => {
  if (!busId || !serviceType) return
  await Bus.findByIdAndUpdate(busId, { serviceType })
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
    const rawSearch = typeof req.query.search === 'string' ? req.query.search : ''
    const requestedPage = Number.parseInt(req.query.page, 10)
    const requestedLimit = Number.parseInt(req.query.limit, 10)
    const search = rawSearch.trim()
    const wantsPagination =
      Number.isFinite(requestedPage) || Number.isFinite(requestedLimit) || Boolean(search)
    const filter = buildRouteFilter(req, search)

    if (!wantsPagination) {
      const routes = await populateRoute(sortRoutes(Route.find(filter)))
      return res.json(routes)
    }

    const limit = PAGE_SIZE_OPTIONS.has(requestedLimit) ? requestedLimit : 10
    const totalItems = await Route.countDocuments(filter)
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1
    const page = Math.min(Math.max(requestedPage || 1, 1), totalPages)
    const skip = (page - 1) * limit

    const [routes, active, assigned, avgDistanceResult] = await Promise.all([
      populateRoute(sortRoutes(Route.find(filter).skip(skip).limit(limit))),
      Route.countDocuments({ ...filter, status: 'active' }),
      Route.countDocuments({
        ...filter,
        busId: { $exists: true, $ne: null },
        driverId: { $exists: true, $ne: null },
      }),
      Route.aggregate([
        { $match: filter },
        { $group: { _id: null, avgDistance: { $avg: '$distance' } } },
      ]),
    ])

    res.json({
      items: routes,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      summary: {
        total: totalItems,
        active,
        assigned,
        avgDistance: avgDistanceResult[0]?.avgDistance ?? null,
      },
    })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

// @desc    Get single route
// @route   GET /api/routes/:id
export const getRouteById = async (req, res) => {
  try {
    const rawRoute = await Route.findById(req.params.id)
    if (rawRoute) {
      assertDepotAccess(req.user, rawRoute.depotId, 'Not allowed to access this route')
    }
    const route = await populateRoute(Route.findById(req.params.id))
    if (!route) {
      return res.status(404).json({ message: 'Route not found' })
    }
    res.json(route)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

// @desc    Create route
// @route   POST /api/routes
export const createRoute = async (req, res) => {
  try {
    const data = prepareRouteData(req.body)
    const { routeNo, routeName, distance, startPoint, endPoint, busId, driverId } = data
    const depotId = resolveWriteDepotId(req.user, data.depotId)

    if (!routeNo?.trim() || !routeName?.trim() || !startPoint?.trim() || !endPoint?.trim()) {
      return res.status(400).json({
        message: 'routeNo, routeName, startPoint, and endPoint are required',
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
    await validateBusAssignment(busId, serviceType, depotId)
    await validateDriverAssignment(driverId, depotId)

    const route = await Route.create({
      ...data,
      depotId,
      createdBy: req.user?.id,
    })

    await syncAssignedBusServiceType(busId, serviceType)

    const populated = await populateRoute(Route.findById(route._id))
    res.status(201).json(populated)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Route number already exists for this depot' })
    }
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
    assertDepotAccess(req.user, existing.depotId, 'Not allowed to manage this route')

    const data = prepareRouteData(req.body)
    const depotId = resolveWriteDepotId(req.user, data.depotId ?? existing.depotId)

    if (data.routeNo !== undefined && !data.routeNo?.trim()) {
      return res.status(400).json({ message: 'routeNo is required' })
    }

    const nextBusId = data.busId !== undefined ? data.busId : existing.busId
    const nextDriverId = data.driverId !== undefined ? data.driverId : existing.driverId
    if (nextBusId && !nextDriverId) {
      return res.status(400).json({ message: 'Select a driver when a bus is assigned' })
    }
    if (nextDriverId && !nextBusId) {
      return res.status(400).json({ message: 'Select a bus when a driver is assigned' })
    }

    const serviceType = data.serviceType ?? existing.serviceType ?? 'ordinary'
    if (nextBusId) await validateBusAssignment(nextBusId, serviceType, depotId)
    if (nextDriverId) await validateDriverAssignment(nextDriverId, depotId)

    data.depotId = depotId

    await Route.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
    await syncAssignedBusServiceType(nextBusId, serviceType)

    const populated = await populateRoute(Route.findById(req.params.id))
    res.json(populated)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Route number already exists for this depot' })
    }
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

// @desc    Delete route
// @route   DELETE /api/routes/:id
export const deleteRoute = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
    if (!route) {
      return res.status(404).json({ message: 'Route not found' })
    }
    assertDepotAccess(req.user, route.depotId, 'Not allowed to manage this route')

    const linkedSchedules = await Schedule.countDocuments({ routeId: route._id })
    if (linkedSchedules > 0) {
      return res.status(409).json({
        message: `Cannot delete route because ${linkedSchedules} schedule(s) are linked to it. Remove those schedules first.`,
      })
    }

    await route.deleteOne()
    res.json({ message: 'Route removed', id: route._id })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}
