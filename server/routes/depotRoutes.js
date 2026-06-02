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

// GET depots is open to all authenticated users (needed for dropdowns)
router.get('/', getDepots)
router.get('/:id', getDepotById)

// Write operations restricted to superadmin
router.post('/', authorize(...API_ACCESS.depots), createDepot)
router.put('/:id', authorize(...API_ACCESS.depots), updateDepot)
router.delete('/:id', authorize(...API_ACCESS.depots), deleteDepot)

export default router
