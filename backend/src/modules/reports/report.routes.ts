import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  getAppointmentReport,
  getDoctorPerformanceReport,
  getFollowUpReport,
  getPatientReport,
  getRevenueReport,
} from './report.controller';
import { reportQuerySchema } from './report.types';

const router = Router();

router.use(authenticate);

router.get(
  '/appointments',
  authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'),
  validate({ query: reportQuerySchema }),
  getAppointmentReport
);

router.get(
  '/revenue',
  authorize('CLINIC_ADMIN', 'RECEPTIONIST'),
  validate({ query: reportQuerySchema }),
  getRevenueReport
);

router.get(
  '/patients',
  authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'),
  validate({ query: reportQuerySchema }),
  getPatientReport
);

router.get(
  '/doctor-performance',
  authorize('CLINIC_ADMIN', 'RECEPTIONIST'),
  validate({ query: reportQuerySchema }),
  getDoctorPerformanceReport
);

router.get(
  '/follow-ups',
  authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'),
  validate({ query: reportQuerySchema }),
  getFollowUpReport
);

export const reportRoutes = router;
