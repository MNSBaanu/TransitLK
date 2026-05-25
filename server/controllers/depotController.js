import Depot from '../models/Depot.js'

const normalizeDepotCode = (code) => (typeof code === 'string' ? code.trim().toUpperCase() : '')
const normalizeRegion = (region) => (typeof region === 'string' ? region.trim() : '')

export const getDepots = async (req, res) => {
  try {
    const depots = await Depot.find().sort({ region: 1, depotName: 1 })
    res.json(depots)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getDepotById = async (req, res) => {
  try {
    const depot = await Depot.findById(req.params.id)
    if (!depot) return res.status(404).json({ message: 'Depot not found' })
    res.json(depot)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const createDepot = async (req, res) => {
  try {
    const { depotCode, region, depotName, location, contactNo } = req.body
    const normalizedDepotCode = normalizeDepotCode(depotCode)
    const normalizedRegion = normalizeRegion(region)

    if (!normalizedDepotCode || !normalizedRegion || !depotName?.trim()) {
      return res.status(400).json({ message: 'depotCode, region and depotName are required' })
    }

    const depot = await Depot.create({
      depotCode: normalizedDepotCode,
      region: normalizedRegion,
      depotName,
      location,
      contactNo,
    })
    res.status(201).json(depot)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Depot code already exists' })
    }
    res.status(500).json({ message: error.message })
  }
}

export const updateDepot = async (req, res) => {
  try {
    const updates = { ...req.body }
    if (updates.depotCode !== undefined) {
      updates.depotCode = normalizeDepotCode(updates.depotCode)
      if (!updates.depotCode) {
        return res.status(400).json({ message: 'depotCode is required' })
      }
    }
    if (updates.region !== undefined) {
      updates.region = normalizeRegion(updates.region)
      if (!updates.region) {
        return res.status(400).json({ message: 'region is required' })
      }
    }

    const depot = await Depot.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
    if (!depot) return res.status(404).json({ message: 'Depot not found' })
    res.json(depot)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Depot code already exists' })
    }
    res.status(500).json({ message: error.message })
  }
}

export const deleteDepot = async (req, res) => {
  try {
    const depot = await Depot.findByIdAndDelete(req.params.id)
    if (!depot) return res.status(404).json({ message: 'Depot not found' })
    res.json({ message: 'Depot removed', id: depot._id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
