// Assigned to: Baanu
// Module: Reporting & Analytics

import express from 'express'
import { getReportsDashboard, exportReportsCsv } from '../controllers/reportController.js'

const router = express.Router()

router.get('/dashboard', getReportsDashboard)
router.get('/export/csv', exportReportsCsv)

export default router
