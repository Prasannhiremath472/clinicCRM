import { Request, Response } from 'express';
import { DocumentType } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { patientService } from './patient.service';
import {
  CreatePatientInput,
  ListPatientsQuery,
  PatientDocumentParams,
  PatientIdParams,
  UpdatePatientInput,
} from './patient.types';

/**
 * clinicId is guaranteed non-null here because every patient route is gated by
 * authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST') at the router level, and
 * SUPER_ADMIN (the only role with a null clinicId) is excluded from that list.
 * This helper exists for defense in depth in case that invariant ever breaks.
 */
function getClinicId(req: Request): string {
  if (!req.user?.clinicId) {
    throw ApiError.forbidden('A clinic context is required to access patient records');
  }
  return req.user.clinicId;
}

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ListPatientsQuery;

  const { items, meta } = await patientService.listPatients(clinicId, query);

  sendSuccess(res, items, 'Patients fetched successfully', 200, meta);
});

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const input = req.body as CreatePatientInput;

  const patient = await patientService.createPatient(clinicId, input);

  sendSuccess(res, patient, 'Patient registered successfully', 201);
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as PatientIdParams;

  const patient = await patientService.getPatient(id, clinicId);

  sendSuccess(res, patient, 'Patient fetched successfully');
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as PatientIdParams;
  const input = req.body as UpdatePatientInput;

  const patient = await patientService.updatePatient(id, clinicId, input);

  sendSuccess(res, patient, 'Patient updated successfully');
});

export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as PatientIdParams;

  await patientService.deletePatient(id, clinicId);

  sendSuccess(res, null, 'Patient deleted successfully');
});

export const uploadPatientDocument = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as PatientIdParams;
  const { type } = req.body as { type: DocumentType };

  if (!req.file) {
    throw ApiError.badRequest('A document file is required');
  }

  const document = await patientService.uploadDocument(id, clinicId, req.file, type);

  sendSuccess(res, document, 'Document uploaded successfully', 201);
});

export const listPatientDocuments = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as PatientIdParams;

  const documents = await patientService.listPatientDocuments(id, clinicId);

  sendSuccess(res, documents, 'Documents fetched successfully');
});

export const deletePatientDocument = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id, documentId } = req.params as unknown as PatientDocumentParams;

  await patientService.deletePatientDocument(documentId, id, clinicId);

  sendSuccess(res, null, 'Document deleted successfully');
});
