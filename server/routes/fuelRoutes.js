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
import { authorize } from '../middleware/authorizeMiddleware.js'
import { API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.use(protect)
router.use(authorize(...API_ACCESS.fuel))

router.get('/summary', getFuelSummary)
router.route('/').get(getAllFuelLogs).post(createFuelLog)
router.route('/:id').get(getFuelLogById).put(updateFuelLog).delete(deleteFuelLog)

export default router
