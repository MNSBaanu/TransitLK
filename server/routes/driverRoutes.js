import express from 'express'
import {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
} from '../controllers/driverController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { ROLES, API_ACCESS } from '../utils/roles.js'

const router = express.Router()

const fleetWrite = API_ACCESS.drivers
const fleetRead = [
  ...API_ACCESS.drivers,
  ROLES.TRANSPORT_SCHEDULER,
  ROLES.DEPOT_MANAGER,
]

router.use(protect)

router
  .route('/')
  .get(authorize(...fleetRead), getAllDrivers)
  .post(authorize(...fleetWrite), createDriver)
router
  .route('/:id')
  .get(authorize(...fleetRead), getDriverById)
  .put(authorize(...fleetWrite), updateDriver)
  .delete(authorize(...fleetWrite), deleteDriver)

export default router
