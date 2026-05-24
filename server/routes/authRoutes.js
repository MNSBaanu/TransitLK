import express from 'express'
import { register, login, getMe } from '../controllers/authController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.post('/register', protect, authorize(...API_ACCESS.users), register)
router.post('/login', login)
router.get('/me', protect, getMe)

export default router
