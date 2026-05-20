import Admin from '../models/Admin.js'
import User from '../models/User.js'

const populateAdmin = (query) =>
  query.populate('userId', 'name email role').populate('depotId', 'depotName location')

export const getAdmins = async (req, res) => {
  try {
    const admins = await populateAdmin(Admin.find().sort({ createdAt: -1 }))
    res.json(admins)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getAdminById = async (req, res) => {
  try {
    const admin = await populateAdmin(Admin.findById(req.params.id))
    if (!admin) return res.status(404).json({ message: 'Admin not found' })
    res.json(admin)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const createAdmin = async (req, res) => {
  try {
    const { userId, depotId } = req.body
    if (!userId) return res.status(400).json({ message: 'userId is required' })

    const user = await User.findById(userId)
    if (!user) return res.status(400).json({ message: 'User not found' })

    const admin = await Admin.create({ userId, depotId: depotId || undefined })
    const populated = await populateAdmin(Admin.findById(admin._id))
    res.status(201).json(populated)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Admin profile already exists for this user' })
    }
    res.status(500).json({ message: error.message })
  }
}

export const updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { depotId: req.body.depotId },
      { new: true, runValidators: true }
    )
    if (!admin) return res.status(404).json({ message: 'Admin not found' })
    const populated = await populateAdmin(Admin.findById(admin._id))
    res.json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id)
    if (!admin) return res.status(404).json({ message: 'Admin not found' })
    res.json({ message: 'Admin removed', id: admin._id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
