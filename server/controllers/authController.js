import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import User from '../models/User.js'
import Driver from '../models/Driver.js'
import { ROLES } from '../utils/roles.js'

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })

const buildAuthResponse = (account, role, accountType, extra = {}) => ({
  _id: account._id,
  name: account.name,
  email: account.email,
  role,
  accountType,
  token: generateToken({
    id: String(account._id),
    role,
    accountType,
    ...extra,
  }),
  ...extra,
})

// @desc    Login (admins → users → drivers)
// @route   POST /api/auth/login
export const login = async (req, res) => {
  const { email, password } = req.body

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    const admin = await Admin.findOne({ email: normalizedEmail })
    if (admin && (await admin.matchPassword(password))) {
      return res.json(
        buildAuthResponse(admin, admin.role, 'admin', {
          depotId: admin.depotId,
        })
      )
    }

    const user = await User.findOne({ email: normalizedEmail })
    if (user) {
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' })
      }
      if (await user.matchPassword(password)) {
        return res.json(
          buildAuthResponse(user, user.role, 'user', { depotId: user.depotId })
        )
      }
    }

    const driver = await Driver.findOne({ email: normalizedEmail }).select('+password')
    if (driver?.password && (await driver.matchPassword(password))) {
      return res.json(
        buildAuthResponse(driver, ROLES.DRIVER, 'driver', {
          driverId: String(driver._id),
        })
      )
    }

    return res.status(401).json({ message: 'Invalid email or password' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Register staff user (administrator only in production; open for dev seeding)
// @route   POST /api/auth/register
export const register = async (req, res) => {
  const { name, email, password, role, depotId } = req.body

  try {
    const exists =
      (await Admin.findOne({ email })) ||
      (await User.findOne({ email })) ||
      (await Driver.findOne({ email }))

    if (exists) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    const user = await User.create({ name, email, password, role, depotId })
    res.status(201).json(
      buildAuthResponse(user, user.role, 'user', { depotId: user.depotId })
    )
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Current session profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const { id, role, accountType, driverId } = req.user

    if (accountType === 'admin') {
      const admin = await Admin.findById(id)
        .select('-password')
        .populate('depotId', 'depotCode depotName region')
      if (!admin) return res.status(404).json({ message: 'Account not found' })
      return res.json({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        accountType: 'admin',
        depotId: admin.depotId,
      })
    }

    if (accountType === 'driver') {
      const driver = await Driver.findById(id).select('-password')
      if (!driver) return res.status(404).json({ message: 'Account not found' })
      return res.json({
        _id: driver._id,
        name: driver.name,
        email: driver.email,
        role: ROLES.DRIVER,
        accountType: 'driver',
        driverId: driverId || String(driver._id),
        licenseNo: driver.licenseNo,
        status: driver.status,
      })
    }

    const user = await User.findById(id)
      .select('-password')
      .populate('depotId', 'depotCode depotName region')
    if (!user) return res.status(404).json({ message: 'Account not found' })
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountType: 'user',
      depotId: user.depotId,
      isActive: user.isActive,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
