import Bus from '../models/Bus.js'
import Route from '../models/Route.js'

// @desc    Create a new bus
// @route   POST /api/buses
export const createBus = async (req, res) => {
  const { regNumber, capacity, mileage, status, depotId, serviceType } = req.body

  try {
    const exists = await Bus.findOne({ regNumber })
    if (exists) {
      return res.status(400).json({ message: 'Bus with this registration number already exists' })
    }

    const bus = await Bus.create({
      regNumber,
      capacity,
      mileage,
      status,
      depotId: depotId || undefined,
      serviceType,
    })
    res.status(201).json(bus)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all buses
// @route   GET /api/buses
export const getAllBuses = async (req, res) => {
  try {
    const { status, depotId } = req.query
    const filter = {}
    if (status) filter.status = status
    if (depotId) filter.depotId = depotId

    const buses = await Bus.find(filter)
      .populate('depotId', 'depotName location')
      .sort({ createdAt: -1 })
    const busIds = buses.map((bus) => bus._id)
    const assignedRoutes = busIds.length
      ? await Route.find({ busId: { $in: busIds } })
          .select('busId routeName serviceType status updatedAt createdAt')
          .sort({ updatedAt: -1, createdAt: -1 })
      : []

    const routeByBusId = new Map()
    for (const route of assignedRoutes) {
      const key = String(route.busId)
      if (!routeByBusId.has(key)) routeByBusId.set(key, route)
    }

    const result = buses.map((bus) => {
      const assignedRoute = routeByBusId.get(String(bus._id))
      const doc = bus.toObject()
      if (assignedRoute?.serviceType) {
        doc.serviceType = assignedRoute.serviceType
        doc.assignedRoute = {
          _id: assignedRoute._id,
          routeName: assignedRoute.routeName,
          serviceType: assignedRoute.serviceType,
          status: assignedRoute.status,
        }
      }
      return doc
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get a single bus by ID
// @route   GET /api/buses/:id
export const getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' })
    }
    res.json(bus)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update a bus
// @route   PUT /api/buses/:id
export const updateBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' })
    }

    const updateData = { ...req.body }
    if (updateData.depotId === '') updateData.depotId = undefined

    const updated = await Bus.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Delete a bus
// @route   DELETE /api/buses/:id
export const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' })
    }

    await bus.deleteOne()
    res.json({ message: 'Bus removed successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
