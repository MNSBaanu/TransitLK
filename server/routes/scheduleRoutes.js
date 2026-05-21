// Assigned to: Baanu
// Module: Schedule Management

import express from 'express'
import {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  checkScheduleConflicts,
} from '../controllers/scheduleController.js'

const router = express.Router()

router.get('/conflicts/check', checkScheduleConflicts)
router.route('/').get(getSchedules).post(createSchedule)
router.route('/:id').get(getScheduleById).put(updateSchedule).delete(deleteSchedule)

export default router
