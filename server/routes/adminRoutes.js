import express from 'express'
import {
  getAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} from '../controllers/adminController.js'

const router = express.Router()

router.route('/').get(getAdmins).post(createAdmin)
router.route('/:id').get(getAdminById).put(updateAdmin).delete(deleteAdmin)

export default router
