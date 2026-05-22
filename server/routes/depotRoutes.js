import express from 'express'
import {
  getDepots,
  getDepotById,
  createDepot,
  updateDepot,
  deleteDepot,
} from '../controllers/depotController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.use(protect)
router.use(authorize(...API_ACCESS.depots))

router.route('/').get(getDepots).post(createDepot)
router.route('/:id').get(getDepotById).put(updateDepot).delete(deleteDepot)

export default router
