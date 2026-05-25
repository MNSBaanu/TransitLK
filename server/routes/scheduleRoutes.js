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
  authorize(ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER),
  checkTimetableConflicts
)

router
  .route('/')
  .get(authorize(...API_ACCESS.schedules), getSchedules)
  .post(
    authorize(ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER),
    createSchedule
  )

router.post(
  '/:id/submit',
  authorize(ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER),
  submitSchedule
)
router.post(
  '/:id/approve',
  authorize(ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR, ROLES.DEPOT_MANAGER),
  approveSchedule
)
router.post(
  '/:id/reject',
  authorize(ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR, ROLES.DEPOT_MANAGER),
  rejectSchedule
)

router
  .route('/:id')
  .get(authorize(...API_ACCESS.schedules), getScheduleById)
  .put(
    authorize(
      ROLES.SUPERADMINISTRATOR,
      ROLES.ADMINISTRATOR,
      ROLES.TRANSPORT_SCHEDULER,
      ROLES.DEPOT_MANAGER
    ),
    updateSchedule
  )
  .delete(
    authorize(ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER),
    deleteSchedule
  )

export default router
