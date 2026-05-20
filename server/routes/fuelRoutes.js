import express from 'express'
import {
  createFuelLog,
  getAllFuelLogs,
  getFuelLogById,
  updateFuelLog,
  deleteFuelLog,
  getFuelSummary,
} from '../controllers/fuelController.js'

const router = express.Router()

router.get('/summary', getFuelSummary)
router.route('/').get(getAllFuelLogs).post(createFuelLog)
router.route('/:id').get(getFuelLogById).put(updateFuelLog).delete(deleteFuelLog)

export default router
