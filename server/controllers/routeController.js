import Route from '../models/Route.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import Schedule from '../models/Schedule.js'
import {
  sanitizeRouteBody,
  validateLocation,
  validateStopLocations,
  finalizeRouteFields,
  isWithinWorkingHours,
} from '../utils/routeHelpers.js'
import { scheduleFilterBlockingRouteRemoval } from '../utils/scheduleHelpers.js'
import {
  defaultMinCapacityForService,
  getDriverLicenseInvalidReason,
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
  select: 'name licenseNo licenseExpiry contactNo workingHours status',
}
const depotPopulate = { path: 'depotId', select: 'depotCode depotName region location' }
const PAGE_SIZE_OPTIONS = new Set([10, 15])

const populateRoute = (query) =>
  query
    .populate(busPopulate)
    .populate(driverPopulate)
    .populate(depotPopulate)
    .populate('createdBy', 'name email role')

/** Oldest records first so recently added routes appear at the end of the list. */
const sortRoutes = (query) =>
  query.sort({ createdAt: 1, routeNo: 1 }).collation({ locale: 'en', numericOrdering: true })

async function attachScheduleCounts(routes) {
  const list = Array.isArray(routes) ? routes : []
  if (!list.length) return list

  const ids = list.map((route) => route._id)
  const counts = await Schedule.aggregate([
    { $match: scheduleFilterBlockingRouteRemoval({ routeId: { $in: ids } }) },
    { $group: { _id: '$routeId', count: { $sum: 1 } } },
  ])
  const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]))

  return list.map((route) => {
    const plain = route.toObject ? route.toObject() : { ...route }
    return { ...plain, scheduleCount: countMap.get(String(route._id)) || 0 }
  })
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const ROUTE_STATUS_FILTERS = new Set(['active', 'inactive', 'draft', 'assigned'])
const ROUTE_SERVICE_FILTERS = new Set(['express', 'ordinary', 'semi-luxury'])

async function summarizeRouteDistance(filter) {
  const routes = await Route.find({ ...filter, distance: { $gt: 0 } })
    .select('distance')
    .lean()

  if (!routes.length) {
    return { avgDistance: null, distanceRouteCount: 0 }
  }

  const totalDistance = routes.reduce((sum, route) => sum + Number(route.distance), 0)
  const count = routes.length
  const avgDistance = Math.round((totalDistance / count) * 10) / 10
  return { avgDistance, distanceRouteCount: count }
}

const buildRouteFilter = (req, { search = '', status = '', serviceType = '' } = {}) => {
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

  if (status && ROUTE_STATUS_FILTERS.has(status)) {
    filter.status = status
  }
  if (serviceType && ROUTE_SERVICE_FILTERS.has(serviceType)) {
    filter.serviceType = serviceType
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
  if (bus.status === 'maintenance') {
    const error = new Error('Bus is under maintenance and cannot be scheduled')
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
  const licenseIssue = getDriverLicenseInvalidReason(driver)
  if (licenseIssue) {
    const error = new Error(licenseIssue)
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

  return finalizeRouteFields(data)
}

const assertRouteStatusTransition = async (existing, nextStatus) => {
  if (!nextStatus || nextStatus === existing.status) return

  if (
    (existing.status === 'active' || existing.status === 'assigned') &&
    nextStatus === 'draft'
  ) {
    const error = new Error(
      'An active or assigned route cannot be moved back to draft. Set it to inactive to pause operations.'
    )
    error.statusCode = 400
    throw error
  }

  if (
    (existing.status === 'active' || existing.status === 'assigned') &&
    nextStatus === 'inactive'
  ) {
    const linkedSchedules = await Schedule.countDocuments(
      scheduleFilterBlockingRouteRemoval({ routeId: existing._id })
    )
    if (linkedSchedules > 0) {
      const error = new Error(
        `Cannot deactivate route while ${linkedSchedules} active schedule(s) are linked. Complete or remove those trips first.`
      )
      error.statusCode = 409
      throw error
    }
  }
}

function applyFleetRouteStatus(data, existing, nextBusId, nextDriverId) {
  const hasFleet = Boolean(nextBusId && nextDriverId)
  const requested = data.status

  if (hasFleet) {
    if (!requested || requested === 'active') {
      data.status = 'assigned'
    }
    return
  }

  if (existing.status === 'assigned' && requested !== 'inactive' && requested !== 'draft') {
    data.status = requested ?? 'active'
  }
}

// @desc    Get all routes
// @route   GET /api/routes
export const getRoutes = async (req, res) => {
  try {
    const rawSearch = typeof req.query.search === 'string' ? req.query.search : ''
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : ''
    const serviceType =
      typeof req.query.serviceType === 'string' ? req.query.serviceType.trim() : ''
    const requestedPage = Number.parseInt(req.query.page, 10)
    const requestedLimit = Number.parseInt(req.query.limit, 10)
    const search = rawSearch.trim()
    const summaryOnly = req.query.summary === '1' || req.query.summary === 'true'
    const wantsPagination =
      Number.isFinite(requestedPage) ||
      Number.isFinite(requestedLimit) ||
      Boolean(search) ||
      Boolean(status) ||
      Boolean(serviceType)
    const filter = buildRouteFilter(req, { search, status, serviceType })

    if (summaryOnly) {
      const routes = await sortRoutes(
        Route.find(filter).select(
          'routeNo routeName startPoint endPoint distance serviceType status stops viaDescription busId driverId depotId'
        )
      ).lean()
      return res.json(routes)
    }

    if (!wantsPagination) {
      const routes = await attachScheduleCounts(
        await populateRoute(sortRoutes(Route.find(filter)))
      )
      return res.json(routes)
    }

    const limit = PAGE_SIZE_OPTIONS.has(requestedLimit) ? requestedLimit : 10
    const totalItems = await Route.countDocuments(filter)
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1
    const page = Math.min(Math.max(requestedPage || 1, 1), totalPages)
    const skip = (page - 1) * limit

    const [routes, active, draft, distanceStats] = await Promise.all([
      populateRoute(sortRoutes(Route.find(filter).skip(skip).limit(limit))),
      Route.countDocuments({ ...filter, status: 'active' }),
      Route.countDocuments({ ...filter, status: 'draft' }),
      summarizeRouteDistance(filter),
    ])

    const items = await attachScheduleCounts(routes)

    res.json({
      items,
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
        draft,
        avgDistance: distanceStats.avgDistance,
        distanceRouteCount: distanceStats.distanceRouteCount,
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
    const [withCounts] = await attachScheduleCounts([route])
    res.json(withCounts)
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

    if (data.status === 'assigned' && (!busId || !driverId)) {
      return res.status(400).json({
        message: 'Assigned status requires both a bus and a driver',
      })
    }

    const serviceType = data.serviceType || 'ordinary'
    await validateBusAssignment(busId, serviceType, depotId)
    await validateDriverAssignment(driverId, depotId)

    if (busId && driverId && data.status !== 'draft' && data.status !== 'inactive') {
      data.status = 'assigned'
    }

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

    applyFleetRouteStatus(data, existing, nextBusId, nextDriverId)

    const nextStatus = data.status ?? existing.status
    if (nextStatus === 'assigned' && (!nextBusId || !nextDriverId)) {
      return res.status(400).json({
        message: 'Assigned status requires both a bus and a driver',
      })
    }
    await assertRouteStatusTransition(existing, nextStatus)

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

    const linkedSchedules = await Schedule.countDocuments(
      scheduleFilterBlockingRouteRemoval({ routeId: route._id })
    )
    if (linkedSchedules > 0) {
      return res.status(409).json({
        message: `Cannot delete route because ${linkedSchedules} active trip(s) are linked to it. Complete or remove those trips first.`,
      })
    }

    await Schedule.deleteMany({ routeId: route._id })
    await route.deleteOne()
    res.json({ message: 'Route removed', id: route._id })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}
