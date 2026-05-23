import express from 'express'
import {
  getAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} from '../controllers/adminController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.use(protect)
router.use(authorize(...API_ACCESS.admins))

router.route('/').get(getAdmins).post(createAdmin)
router.route('/:id').get(getAdminById).put(updateAdmin).delete(deleteAdmin)

export default router
