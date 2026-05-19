import express from 'express'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

// Placeholder — implementation pending
router.get('/', protect, (req, res) => res.json({ message: 'Reports module coming soon' }))

export default router
