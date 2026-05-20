import express from 'express'
import {
  createBus,
  getAllBuses,
  getBusById,
  updateBus,
  deleteBus,
} from '../controllers/busController.js'

const router = express.Router()

router.route('/').get(getAllBuses).post(createBus)
router.route('/:id').get(getBusById).put(updateBus).delete(deleteBus)

export default router
