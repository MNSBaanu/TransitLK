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
  checkTimetableConflicts,
  submitSchedule,
  approveSchedule,
  rejectSchedule,
  updateDriverTripStatus,
} from '../controllers/scheduleController.js'
import protect from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/authorizeMiddleware.js'
import { ROLES, API_ACCESS } from '../utils/roles.js'

const router = express.Router()

router.use(protect)

router.get(
  '/conflicts/check',
  authorize(...API_ACCESS.schedules.filter((r) => r !== ROLES.DRIVER)),
  checkScheduleConflicts
)

router.post(
  '/conflicts/timetable',
  authorize(ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER),
  checkTimetableConflicts
)

router
  .route('/')
  .get(authorize(...API_ACCESS.schedules), getSchedules)
  .post(
    authorize(ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER),
    createSchedule
  )

router.post(
  '/:id/submit',
  authorize(ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER),
  submitSchedule
)
router.post(
  '/:id/approve',
  authorize(ROLES.DEPOT_MANAGER, ROLES.ADMINISTRATOR),
  approveSchedule
)
router.post(
  '/:id/reject',
  authorize(ROLES.DEPOT_MANAGER, ROLES.ADMINISTRATOR),
  rejectSchedule
)

router.patch(
  '/:id/trip-status',
  authorize(ROLES.DRIVER),
  updateDriverTripStatus
)

router
  .route('/:id')
  .get(authorize(...API_ACCESS.schedules), getScheduleById)
  .put(
    authorize(
      ROLES.ADMINISTRATOR,
      ROLES.TRANSPORT_SCHEDULER,
      ROLES.DEPOT_MANAGER
    ),
    updateSchedule
  )
  .delete(
    authorize(ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER),
    deleteSchedule
  )

export default router
