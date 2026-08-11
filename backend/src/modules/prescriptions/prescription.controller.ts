import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { prescriptionService } from './prescription.service';
import {
  ConsultationIdParams,
  ListPrescriptionsQuery,
  PrescriptionIdParams,
  SavePrescriptionInput,
} from './prescription.types';

/**
 * clinicId is guaranteed non-null here because every prescription route is gated by
 * authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST') at the router level, and
 * SUPER_ADMIN (the only role with a null clinicId) is excluded from that list.
 * This helper exists for defense in depth in case that invariant ever breaks.
 */
function getClinicId(req: Request): string {
  if (!req.user?.clinicId) {
    throw ApiError.forbidden('A clinic context is required to access prescription records');
  }
  return req.user.clinicId;
}

export const listPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ListPrescriptionsQuery;

  const { items, meta } = await prescriptionService.listPrescriptions(clinicId, query);

  sendSuccess(res, items, 'Prescriptions fetched successfully', 200, meta);
});

export const getPrescription = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as PrescriptionIdParams;

  const prescription = await prescriptionService.getPrescription(id, clinicId);

  sendSuccess(res, prescription, 'Prescription fetched successfully');
});

export const getPrescriptionByConsultation = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { consultationId } = req.params as unknown as ConsultationIdParams;

  const prescription = await prescriptionService.getPrescriptionByConsultation(consultationId, clinicId);

  sendSuccess(res, prescription, 'Prescription fetched successfully');
});

export const getPrescriptionPdf = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as PrescriptionIdParams;

  const result = await prescriptionService.getOrRegeneratePdf(id, clinicId);

  sendSuccess(res, result, 'Prescription PDF status fetched successfully');
});

export const savePrescription = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { consultationId } = req.params as unknown as ConsultationIdParams;
  const doctorUserId = req.user!.id;
  const input = req.body as SavePrescriptionInput;

  const prescription = await prescriptionService.savePrescription(consultationId, clinicId, doctorUserId, input);

  sendSuccess(res, prescription, 'Prescription saved successfully');
});
