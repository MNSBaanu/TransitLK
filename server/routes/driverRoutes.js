import express from 'express'
import {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
} from '../controllers/driverController.js'

const router = express.Router()

router.route('/').get(getAllDrivers).post(createDriver)
router.route('/:id').get(getDriverById).put(updateDriver).delete(deleteDriver)

export default router
