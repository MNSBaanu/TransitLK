/**
 * Restrict route handlers to specific roles (use after protect).
 */
export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ message: 'Not authorized' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role "${req.user.role}" is not allowed to perform this action`,
      })
    }
    next()
  }

export default authorize
