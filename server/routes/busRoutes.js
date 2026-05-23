import express from 'express'
import {
  createBus,
  getAllBuses,
  getBusById,
  updateBus,
  deleteBus,
} from '../controllers/busController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { ROLES, API_ACCESS } from '../utils/roles.js'

const router = express.Router()

const fleetWrite = API_ACCESS.buses
const fleetRead = [
  ...API_ACCESS.buses,
  ROLES.TRANSPORT_SCHEDULER,
  ROLES.DEPOT_MANAGER,
]

router.use(protect)

router.route('/').get(authorize(...fleetRead), getAllBuses).post(authorize(...fleetWrite), createBus)
router
  .route('/:id')
  .get(authorize(...fleetRead), getBusById)
  .put(authorize(...fleetWrite), updateBus)
  .delete(authorize(...fleetWrite), deleteBus)

export default router
