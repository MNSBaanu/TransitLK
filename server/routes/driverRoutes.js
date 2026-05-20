import express from 'express'
import {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
} from '../controllers/driverController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.route('/').get(protect, getAllDrivers).post(protect, createDriver)
router.route('/:id').get(protect, getDriverById).put(protect, updateDriver).delete(protect, deleteDriver)

export default router
