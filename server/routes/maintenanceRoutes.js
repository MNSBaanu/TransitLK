import express from 'express'
import {
  createMaintenance,
  getAllMaintenance,
  getMaintenanceById,
  getFuelMaintenanceReport,
  exportFuelMaintenanceReportCsv,
  exportFuelMaintenanceReportPdf,
  updateMaintenance,
  deleteMaintenance,
} from '../controllers/maintenanceController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.use(protect)
router.use(authorize(...API_ACCESS.maintenance))

router.get('/report/pdf', exportFuelMaintenanceReportPdf)
router.get('/report/csv', exportFuelMaintenanceReportCsv)
router.get('/report', getFuelMaintenanceReport)
router.route('/').get(getAllMaintenance).post(createMaintenance)
router.route('/:id').get(getMaintenanceById).put(updateMaintenance).delete(deleteMaintenance)

export default router
