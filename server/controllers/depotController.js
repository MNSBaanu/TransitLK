import Depot from '../models/Depot.js'

export const getDepots = async (req, res) => {
  try {
    const depots = await Depot.find().sort({ depotName: 1 })
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
    const { depotName, location, contactNo } = req.body
    if (!depotName?.trim()) {
      return res.status(400).json({ message: 'depotName is required' })
    }
    const depot = await Depot.create({ depotName, location, contactNo })
    res.status(201).json(depot)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateDepot = async (req, res) => {
  try {
    const depot = await Depot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    if (!depot) return res.status(404).json({ message: 'Depot not found' })
    res.json(depot)
  } catch (error) {
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
