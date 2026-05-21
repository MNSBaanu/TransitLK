import express from 'express'
import {
  getDepots,
  getDepotById,
  createDepot,
  updateDepot,
  deleteDepot,
} from '../controllers/depotController.js'

const router = express.Router()

router.route('/').get(getDepots).post(createDepot)
router.route('/:id').get(getDepotById).put(updateDepot).delete(deleteDepot)

export default router
