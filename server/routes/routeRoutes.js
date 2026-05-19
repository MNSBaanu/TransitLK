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

const router = express.Router()

// Auth disabled for development — re-enable protect before production
router.route('/').get(getRoutes).post(createRoute)
router.route('/:id').get(getRouteById).put(updateRoute).delete(deleteRoute)

export default router
