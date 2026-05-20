import express from 'express'
import {
  createFuelLog,
  getAllFuelLogs,
  getFuelLogById,
  updateFuelLog,
  deleteFuelLog,
  getFuelSummary,
} from '../controllers/fuelController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/summary', protect, getFuelSummary)
router.route('/').get(protect, getAllFuelLogs).post(protect, createFuelLog)
router.route('/:id').get(protect, getFuelLogById).put(protect, updateFuelLog).delete(protect, deleteFuelLog)

export default router
