// Assigned to: Baanu
// Module: Reporting & Analytics

import express from 'express'
import {
  getReportsDashboard,
  exportReportsCsv,
  exportReportsPdf,
} from '../controllers/reportController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.use(protect)
router.use(authorize(...API_ACCESS.reports))

router.get('/dashboard', getReportsDashboard)
router.get('/export/csv', exportReportsCsv)
router.get('/export/pdf', exportReportsPdf)

export default router
