import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  completeConsultation,
  getConsultation,
  getConsultationByAppointment,
  listConsultations,
  startConsultation,
  updateConsultation,
} from './consultation.controller';
import {
  appointmentIdParamsSchema,
  consultationIdParamsSchema,
  listConsultationsQuerySchema,
  updateConsultationSchema,
} from './consultation.types';

const router = Router();

router.use(authenticate, authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'));

router.get('/', validate({ query: listConsultationsQuerySchema }), listConsultations);
router.get('/:id', validate({ params: consultationIdParamsSchema }), getConsultation);
router.get(
  '/by-appointment/:appointmentId',
  validate({ params: appointmentIdParamsSchema }),
  getConsultationByAppointment
);

router.post(
  '/start/:appointmentId',
  authorize('DOCTOR'),
  validate({ params: appointmentIdParamsSchema }),
  startConsultation
);
router.patch(
  '/:id',
  authorize('DOCTOR'),
  validate({ params: consultationIdParamsSchema, body: updateConsultationSchema }),
  updateConsultation
);
router.patch(
  '/:id/complete',
  authorize('DOCTOR'),
  validate({ params: consultationIdParamsSchema }),
  completeConsultation
);

export const consultationRoutes = router;
