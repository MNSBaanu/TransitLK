// Assigned to: Irfa — list endpoint for route assignment (Baanu)
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

import express from 'express'
import Driver from '../models/Driver.js'

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const drivers = await Driver.find().sort({ name: 1 })
    res.json(drivers)
  } catch (err) {
    next(err)
  }
})


export default router
