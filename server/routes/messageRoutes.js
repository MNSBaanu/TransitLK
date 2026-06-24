import express from 'express'
import {
  getConversations,
  getConversationMessages,
  createConversation,
  sendMessage,
  markConversationRead,
  getAvailableUsers,
} from '../controllers/messageController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()
router.use(protect)

router.route('/conversations').get(getConversations).post(createConversation)
router.route('/conversations/:id').get(getConversationMessages)
router.route('/conversations/:id/read').put(markConversationRead)
router.route('/').post(sendMessage)
router.route('/users').get(getAvailableUsers)

export default router
