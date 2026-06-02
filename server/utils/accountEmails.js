import Admin from '../models/Admin.js'
import User from '../models/User.js'
import Driver from '../models/Driver.js'

export async function emailInUse(email, { adminId, userId, driverId } = {}) {
  const normalized = email.trim().toLowerCase()
  const [admin, user, driver] = await Promise.all([
    Admin.findOne({
      email: normalized,
      ...(adminId ? { _id: { $ne: adminId } } : {}),
    }),
    User.findOne({
      email: normalized,
      ...(userId ? { _id: { $ne: userId } } : {}),
    }),
    Driver.findOne({
      email: normalized,
      ...(driverId ? { _id: { $ne: driverId } } : {}),
    }),
  ])

  return Boolean(admin || user || driver)
}
