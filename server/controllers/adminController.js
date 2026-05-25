import Admin from '../models/Admin.js'
import { emailInUse } from '../utils/accountEmails.js'
import { ROLES } from '../utils/roles.js'

const populateAdmin = (query) =>
  query.populate('userId', 'name email role').populate('depotId', 'depotCode depotName region location')

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
    const { name, email, password, depotId, userId, role } = req.body
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'name, email, and password are required' })
    }
    if (![ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR].includes(role || ROLES.ADMINISTRATOR)) {
      return res.status(400).json({ message: 'Invalid admin role' })
    }
    if ((role || ROLES.ADMINISTRATOR) === ROLES.ADMINISTRATOR && !depotId) {
      return res.status(400).json({ message: 'Depot assignment is required for administrators' })
    }
    if (await emailInUse(email)) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    const admin = await Admin.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role || ROLES.ADMINISTRATOR,
      depotId: depotId || undefined,
      userId: userId || undefined,
    })
    const populated = await populateAdmin(Admin.findById(admin._id))
    res.status(201).json(populated)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Admin with this email already exists' })
    }
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

export const updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id)
    if (!admin) return res.status(404).json({ message: 'Admin not found' })

    const { name, email, password, depotId, role, userId } = req.body

    if (name?.trim()) admin.name = name.trim()
    if (email?.trim()) {
      const normalized = email.trim().toLowerCase()
      if (normalized !== admin.email && (await emailInUse(normalized, { adminId: admin._id }))) {
        return res.status(400).json({ message: 'Email already in use' })
      }
      admin.email = normalized
    }
    if (role !== undefined) {
      if (![ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR].includes(role)) {
        return res.status(400).json({ message: 'Invalid admin role' })
      }
      admin.role = role
    }
    if (password) admin.password = password
    if (userId !== undefined) admin.userId = userId || undefined
    if (depotId !== undefined) admin.depotId = depotId || undefined

    if (admin.role === ROLES.ADMINISTRATOR && !admin.depotId) {
      return res.status(400).json({ message: 'Depot assignment is required for administrators' })
    }

    await admin.save()
    const populated = await populateAdmin(Admin.findById(admin._id))
    res.json(populated)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

export const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id)
    if (!admin) return res.status(404).json({ message: 'Admin not found' })
    res.json({ message: 'Admin removed', id: admin._id })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}
