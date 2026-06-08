import express from 'express'
import {
  getNotifications,
  generateNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(protect)

router.route('/').get(getNotifications)
router.route('/generate').post(generateNotifications)
router.route('/read-all').put(markAllAsRead)
router.route('/:id/read').put(markAsRead)
router.route('/:id').delete(deleteNotification)

export default router
