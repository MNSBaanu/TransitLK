import express from 'express'
import {
  createMaintenance,
  getAllMaintenance,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
} from '../controllers/maintenanceController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.use(protect)
router.use(authorize(...API_ACCESS.maintenance))

router.route('/').get(getAllMaintenance).post(createMaintenance)
router.route('/:id').get(getMaintenanceById).put(updateMaintenance).delete(deleteMaintenance)

export default router
