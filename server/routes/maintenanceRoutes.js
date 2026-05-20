import express from 'express'
import {
  createMaintenance,
  getAllMaintenance,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
} from '../controllers/maintenanceController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.route('/').get(protect, getAllMaintenance).post(protect, createMaintenance)
router.route('/:id').get(protect, getMaintenanceById).put(protect, updateMaintenance).delete(protect, deleteMaintenance)

export default router
