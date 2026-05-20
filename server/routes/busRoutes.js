<<<<<<< HEAD
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
=======
// Assigned to: Irfa
// Module: Vehicle Management
// TODO: Implement CRUD for buses/vehicles

import express from 'express'
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Vehicle Management API — implementation pending (Irfa)' })
})
>>>>>>> 27e49edb341a6ecfcfe5e736c5a7177df1f1b971

export default router
