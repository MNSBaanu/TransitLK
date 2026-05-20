// Assigned to: Irfa — list endpoint for route assignment (Baanu)
import express from 'express'
import {
  createBus,
  getAllBuses,
  getBusById,
  updateBus,
  deleteBus,
} from '../controllers/busController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.route('/').get(protect, getAllBuses).post(protect, createBus)
router.route('/:id').get(protect, getBusById).put(protect, updateBus).delete(protect, deleteBus)

import express from 'express'
import Bus from '../models/Bus.js'

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const buses = await Bus.find().sort({ regNumber: 1 })
    res.json(buses)
  } catch (err) {
    next(err)
  }
})


export default router
