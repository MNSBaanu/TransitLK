import Admin from '../models/Admin.js'
import User from '../models/User.js'
import { STAFF_ROLES } from '../utils/roles.js'
import { emailInUse } from '../utils/accountEmails.js'
import {
  assertDepotAccess,
  isSuperadministrator,
  requireUserDepot,
  resolveWriteDepotId,
} from '../utils/depotAccess.js'

const populateDepot = (query) => query.populate('depotId', 'depotName location')

// @desc    List depot workspace accounts (admins + staff; no drivers)
// @route   GET /api/users
export const listWorkspaceUsers = async (req, res) => {
  try {
    const adminFilter = {}
    const staffFilter = {}

    if (!isSuperadministrator(req.user)) {
      const depotId = requireUserDepot(req.user)
      // Backfill legacy staff accounts that were created before depot scoping.
      // This keeps existing depot users visible in the current depot workspace.
      await User.updateMany(
        {
          $or: [{ depotId: { $exists: false } }, { depotId: null }],
        },
        { $set: { depotId } }
      )
      adminFilter.depotId = depotId
      staffFilter.depotId = depotId
    }

    const [admins, staff] = await Promise.all([
      populateDepot(Admin.find(adminFilter).select('-password').sort({ name: 1 })),
      populateDepot(User.find(staffFilter).select('-password').sort({ name: 1 })),
    ])

    const accounts = [
      ...admins.map((a) => ({
        _id: a._id,
        name: a.name,
        email: a.email,
        role: a.role,
        accountType: 'admin',
        isActive: true,
        depotId: a.depotId,
        createdAt: a.createdAt,
      })),
      ...staff.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        accountType: 'user',
        isActive: u.isActive,
        depotId: u.depotId,
        createdAt: u.createdAt,
      })),
    ]

    res.json(accounts)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Create staff user (scheduler, fleet manager, depot manager)
// @route   POST /api/users
export const createStaffUser = async (req, res) => {
  try {
    const { name, email, password, role, depotId } = req.body

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' })
    }
    if (!STAFF_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid staff role' })
    }
    if (await emailInUse(email)) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    const assignedDepotId = resolveWriteDepotId(req.user, depotId)

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      depotId: assignedDepotId,
    })

    const populated = await populateDepot(User.findById(user._id).select('-password'))
    res.status(201).json({
      _id: populated._id,
      name: populated.name,
      email: populated.email,
      role: populated.role,
      accountType: 'user',
      isActive: populated.isActive,
      depotId: populated.depotId,
      createdAt: populated.createdAt,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' })
    }
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

// @desc    Update staff user
// @route   PUT /api/users/:id
export const updateStaffUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'Staff user not found' })
    assertDepotAccess(req.user, user.depotId, 'Not allowed to manage users outside your depot')

    const { name, email, role, depotId, isActive, password } = req.body

    if (name?.trim()) user.name = name.trim()
    if (email?.trim()) {
      const nextEmail = email.trim().toLowerCase()
      if (nextEmail !== user.email && (await emailInUse(nextEmail, { userId: user._id }))) {
        return res.status(400).json({ message: 'Email already in use' })
      }
      user.email = nextEmail
    }
    if (role !== undefined) {
      if (!STAFF_ROLES.includes(role)) {
        return res.status(400).json({ message: 'Invalid staff role' })
      }
      user.role = role
    }
    if (depotId !== undefined || !isSuperadministrator(req.user)) {
      user.depotId = resolveWriteDepotId(req.user, depotId)
    }
    if (typeof isActive === 'boolean') user.isActive = isActive
    if (password) user.password = password

    await user.save()
    const populated = await populateDepot(User.findById(user._id).select('-password'))
    res.json({
      _id: populated._id,
      name: populated.name,
      email: populated.email,
      role: populated.role,
      accountType: 'user',
      isActive: populated.isActive,
      depotId: populated.depotId,
      createdAt: populated.createdAt,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' })
    }
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

// @desc    Remove staff user
// @route   DELETE /api/users/:id
export const deleteStaffUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'Staff user not found' })
    assertDepotAccess(req.user, user.depotId, 'Not allowed to manage users outside your depot')
    await user.deleteOne()
    res.json({ message: 'User removed', id: user._id })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}
