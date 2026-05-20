<<<<<<< HEAD
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
=======
// Assigned to: Irfa
// Module: Driver Management
// TODO: Implement CRUD for drivers

import express from 'express'
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Driver Management API — implementation pending (Irfa)' })
})
>>>>>>> 27e49edb341a6ecfcfe5e736c5a7177df1f1b971

export default router
