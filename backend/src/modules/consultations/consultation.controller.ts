import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { consultationService } from './consultation.service';
import {
  AppointmentIdParams,
  ConsultationIdParams,
  ListConsultationsQuery,
  UpdateConsultationInput,
} from './consultation.types';

/**
 * clinicId is guaranteed non-null here because every consultation route is gated by
 * authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST') at the router level, and
 * SUPER_ADMIN (the only role with a null clinicId) is excluded from that list.
 * This helper exists for defense in depth in case that invariant ever breaks.
 */
function getClinicId(req: Request): string {
  if (!req.user?.clinicId) {
    throw ApiError.forbidden('A clinic context is required to access consultation records');
  }
  return req.user.clinicId;
}

export const listConsultations = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ListConsultationsQuery;

  const { items, meta } = await consultationService.listConsultations(clinicId, query);

  sendSuccess(res, items, 'Consultations fetched successfully', 200, meta);
});

export const getConsultation = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as ConsultationIdParams;

  const consultation = await consultationService.getConsultation(id, clinicId);

  sendSuccess(res, consultation, 'Consultation fetched successfully');
});

export const getConsultationByAppointment = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { appointmentId } = req.params as unknown as AppointmentIdParams;

  const consultation = await consultationService.getConsultationByAppointment(appointmentId, clinicId);

  sendSuccess(res, consultation, 'Consultation fetched successfully');
});

export const startConsultation = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { appointmentId } = req.params as unknown as AppointmentIdParams;
  const doctorUserId = req.user!.id;

  const consultation = await consultationService.startConsultation(appointmentId, clinicId, doctorUserId);

  sendSuccess(res, consultation, 'Consultation started successfully', 201);
});

export const updateConsultation = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as ConsultationIdParams;
  const input = req.body as UpdateConsultationInput;

  const consultation = await consultationService.updateConsultation(id, clinicId, input);

  sendSuccess(res, consultation, 'Consultation updated successfully');
});

export const completeConsultation = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as ConsultationIdParams;

  const consultation = await consultationService.completeConsultation(id, clinicId);

  sendSuccess(res, consultation, 'Consultation completed successfully');
});
