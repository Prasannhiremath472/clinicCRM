import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createDoctor,
  createLeave,
  deactivateDoctor,
  deleteLeave,
  getAvailability,
  getDoctor,
  getMyDoctorProfile,
  getSchedule,
  listDoctors,
  listLeaves,
  setSchedule,
  updateDoctor,
} from './doctor.controller';
import {
  availabilityQuerySchema,
  createDoctorSchema,
  createLeaveSchema,
  doctorIdParamsSchema,
  doctorLeaveParamsSchema,
  listDoctorsQuerySchema,
  listLeavesQuerySchema,
  updateDoctorSchema,
  upsertScheduleSchema,
} from './doctor.types';

const router = Router();

router.use(authenticate, authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'));

router.get('/', validate({ query: listDoctorsQuerySchema }), listDoctors);
router.post('/', authorize('CLINIC_ADMIN'), validate({ body: createDoctorSchema }), createDoctor);

router.get('/me', authorize('DOCTOR'), getMyDoctorProfile);

router.get('/:id', validate({ params: doctorIdParamsSchema }), getDoctor);
router.patch(
  '/:id',
  authorize('CLINIC_ADMIN'),
  validate({ params: doctorIdParamsSchema, body: updateDoctorSchema }),
  updateDoctor
);
router.delete(
  '/:id',
  authorize('CLINIC_ADMIN'),
  validate({ params: doctorIdParamsSchema }),
  deactivateDoctor
);

router.get('/:id/availability', validate({ params: doctorIdParamsSchema, query: availabilityQuerySchema }), getAvailability);

router.get('/:id/schedule', validate({ params: doctorIdParamsSchema }), getSchedule);
router.put(
  '/:id/schedule',
  authorize('CLINIC_ADMIN'),
  validate({ params: doctorIdParamsSchema, body: upsertScheduleSchema }),
  setSchedule
);

router.get('/:id/leaves', validate({ params: doctorIdParamsSchema, query: listLeavesQuerySchema }), listLeaves);
router.post(
  '/:id/leaves',
  authorize('CLINIC_ADMIN'),
  validate({ params: doctorIdParamsSchema, body: createLeaveSchema }),
  createLeave
);
router.delete(
  '/:id/leaves/:leaveId',
  authorize('CLINIC_ADMIN'),
  validate({ params: doctorLeaveParamsSchema }),
  deleteLeave
);

export const doctorRoutes = router;
