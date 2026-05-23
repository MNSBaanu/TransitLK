import express from 'express'
import {
  listWorkspaceUsers,
  createStaffUser,
  updateStaffUser,
  deleteStaffUser,
} from '../controllers/userController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.use(protect)
router.use(authorize(...API_ACCESS.users))

router.route('/').get(listWorkspaceUsers).post(createStaffUser)
router.route('/:id').put(updateStaffUser).delete(deleteStaffUser)

export default router
