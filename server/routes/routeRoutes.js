// Assigned to: Baanu
// Module: Route Planning

import express from 'express'
import {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
} from '../controllers/routeController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.use(protect)
router.use(authorize(...API_ACCESS.routes))

router.route('/').get(getRoutes).post(createRoute)
router.route('/:id').get(getRouteById).put(updateRoute).delete(deleteRoute)

export default router
