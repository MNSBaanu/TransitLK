import express from 'express'
import protect from '../middleware/authMiddleware.js'
import authorize from '../middleware/authorizeMiddleware.js'
import { downloadSampleCsv, importCsv } from '../controllers/importController.js'
import { ROLES } from '../utils/roles.js'

const router = express.Router()

const IMPORT_ACCESS = {
  vehicles: [ROLES.ADMINISTRATOR, ROLES.FLEET_MANAGER],
  drivers: [ROLES.ADMINISTRATOR, ROLES.FLEET_MANAGER],
  routes: [ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER],
  users: [ROLES.ADMINISTRATOR, ROLES.SUPERADMINISTRATOR],
  maintenance: [ROLES.ADMINISTRATOR, ROLES.FLEET_MANAGER, ROLES.TRANSPORT_SCHEDULER],
}

function authorizeImportType(req, res, next) {
  const { type } = req.params
  const allowed = IMPORT_ACCESS[type]
  if (!allowed) {
    return res.status(404).json({ message: 'Unknown import type' })
  }
  return authorize(...allowed)(req, res, next)
}

router.use(protect)

router.get('/sample/:type', authorizeImportType, downloadSampleCsv)
router.post('/:type', authorizeImportType, importCsv)

export default router
