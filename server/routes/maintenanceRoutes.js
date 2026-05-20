<<<<<<< HEAD
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
=======
// Assigned to: Irfa
// Module: Fuel & Maintenance Log
// TODO: Implement CRUD for maintenance and fuel logs

import express from 'express'
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Fuel & Maintenance API — implementation pending (Irfa)' })
})
>>>>>>> 27e49edb341a6ecfcfe5e736c5a7177df1f1b971

export default router
