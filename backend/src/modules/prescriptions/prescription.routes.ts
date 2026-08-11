import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  getPrescription,
  getPrescriptionByConsultation,
  getPrescriptionPdf,
  listPrescriptions,
  savePrescription,
} from './prescription.controller';
import {
  consultationIdParamsSchema,
  listPrescriptionsQuerySchema,
  prescriptionIdParamsSchema,
  savePrescriptionSchema,
} from './prescription.types';

const router = Router();

router.use(authenticate, authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'));

router.get('/', validate({ query: listPrescriptionsQuerySchema }), listPrescriptions);
router.get('/:id', validate({ params: prescriptionIdParamsSchema }), getPrescription);
router.get(
  '/by-consultation/:consultationId',
  validate({ params: consultationIdParamsSchema }),
  getPrescriptionByConsultation
);
router.get('/:id/pdf', validate({ params: prescriptionIdParamsSchema }), getPrescriptionPdf);

router.put(
  '/by-consultation/:consultationId',
  authorize('DOCTOR'),
  validate({ params: consultationIdParamsSchema, body: savePrescriptionSchema }),
  savePrescription
);

export const prescriptionRoutes = router;
