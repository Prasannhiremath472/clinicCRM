import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  cancelAppointment,
  createAppointment,
  getAppointment,
  getAvailability,
  listAppointments,
  rescheduleAppointment,
  updateAppointmentStatus,
} from './appointment.controller';
import {
  appointmentIdParamsSchema,
  cancelAppointmentSchema,
  checkAvailabilityQuerySchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentSchema,
  updateStatusSchema,
} from './appointment.types';

const router = Router();

router.use(authenticate, authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'));

router.get('/', validate({ query: listAppointmentsQuerySchema }), listAppointments);
router.get('/availability', validate({ query: checkAvailabilityQuerySchema }), getAvailability);
router.post('/', validate({ body: createAppointmentSchema }), createAppointment);

router.get('/:id', validate({ params: appointmentIdParamsSchema }), getAppointment);
router.patch(
  '/:id/reschedule',
  validate({ params: appointmentIdParamsSchema, body: rescheduleAppointmentSchema }),
  rescheduleAppointment
);
router.patch(
  '/:id/cancel',
  validate({ params: appointmentIdParamsSchema, body: cancelAppointmentSchema }),
  cancelAppointment
);
router.patch(
  '/:id/status',
  validate({ params: appointmentIdParamsSchema, body: updateStatusSchema }),
  updateAppointmentStatus
);

export const appointmentRoutes = router;
