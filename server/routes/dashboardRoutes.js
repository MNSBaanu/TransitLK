import express from 'express'
import { getDashboardSummary } from '../controllers/dashboardController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.get('/', protect, authorize(...API_ACCESS.dashboard), getDashboardSummary)

export default router
