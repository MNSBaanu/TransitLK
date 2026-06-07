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
import { ROLES, API_ACCESS } from '../utils/roles.js'

const router = express.Router()

const routeWrite = API_ACCESS.routes
const routeRead = [...API_ACCESS.routes, ROLES.DEPOT_MANAGER]

router.use(protect)

router.route('/').get(authorize(...routeRead), getRoutes).post(authorize(...routeWrite), createRoute)
router
  .route('/:id')
  .get(authorize(...routeRead), getRouteById)
  .put(authorize(...routeWrite), updateRoute)
  .delete(authorize(...routeWrite), deleteRoute)

export default router
