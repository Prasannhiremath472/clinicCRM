import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createPatient,
  deletePatient,
  deletePatientDocument,
  getPatient,
  listPatientDocuments,
  listPatients,
  updatePatient,
  uploadPatientDocument,
} from './patient.controller';
import {
  createPatientSchema,
  listPatientsQuerySchema,
  patientDocumentParamsSchema,
  patientIdParamsSchema,
  updatePatientSchema,
  uploadDocumentBodySchema,
} from './patient.types';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(authenticate, authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'));

router.get('/', validate({ query: listPatientsQuerySchema }), listPatients);
router.post('/', validate({ body: createPatientSchema }), createPatient);
router.get('/:id', validate({ params: patientIdParamsSchema }), getPatient);
router.patch('/:id', validate({ params: patientIdParamsSchema, body: updatePatientSchema }), updatePatient);
router.delete('/:id', authorize('CLINIC_ADMIN'), validate({ params: patientIdParamsSchema }), deletePatient);

router.post(
  '/:id/documents',
  upload.single('document'),
  validate({ params: patientIdParamsSchema, body: uploadDocumentBodySchema }),
  uploadPatientDocument
);
router.get('/:id/documents', validate({ params: patientIdParamsSchema }), listPatientDocuments);
router.delete(
  '/:id/documents/:documentId',
  authorize('CLINIC_ADMIN', 'DOCTOR'),
  validate({ params: patientDocumentParamsSchema }),
  deletePatientDocument
);

export const patientRoutes = router;
