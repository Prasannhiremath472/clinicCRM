import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { appointmentService } from './appointment.service';
import {
  AppointmentIdParams,
  CancelAppointmentInput,
  CheckAvailabilityQuery,
  CreateAppointmentInput,
  ListAppointmentsQuery,
  RescheduleAppointmentInput,
  UpdateStatusInput,
} from './appointment.types';

/**
 * clinicId is guaranteed non-null here because every appointment route is gated by
 * authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST') at the router level, and
 * SUPER_ADMIN (the only role with a null clinicId) is excluded from that list.
 * This helper exists for defense in depth in case that invariant ever breaks.
 */
function getClinicId(req: Request): string {
  if (!req.user?.clinicId) {
    throw ApiError.forbidden('A clinic context is required to access appointment records');
  }
  return req.user.clinicId;
}

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ListAppointmentsQuery;

  const { items, meta } = await appointmentService.listAppointments(clinicId, query);

  sendSuccess(res, items, 'Appointments fetched successfully', 200, meta);
});

export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { doctorId, date } = req.query as unknown as CheckAvailabilityQuery;

  const availability = await appointmentService.getDoctorAvailability(doctorId, clinicId, date);

  sendSuccess(res, availability, 'Availability fetched successfully');
});

export const getAppointment = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as AppointmentIdParams;

  const appointment = await appointmentService.getAppointment(id, clinicId);

  sendSuccess(res, appointment, 'Appointment fetched successfully');
});

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const createdById = req.user!.id;
  const input = req.body as CreateAppointmentInput;

  const appointment = await appointmentService.createAppointment(clinicId, createdById, input);

  sendSuccess(res, appointment, 'Appointment booked successfully', 201);
});

export const rescheduleAppointment = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as AppointmentIdParams;
  const input = req.body as RescheduleAppointmentInput;

  const appointment = await appointmentService.rescheduleAppointment(id, clinicId, input);

  sendSuccess(res, appointment, 'Appointment rescheduled successfully');
});

export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as AppointmentIdParams;
  const input = req.body as CancelAppointmentInput;

  const appointment = await appointmentService.cancelAppointment(id, clinicId, input);

  sendSuccess(res, appointment, 'Appointment cancelled successfully');
});

export const updateAppointmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as AppointmentIdParams;
  const { status } = req.body as UpdateStatusInput;

  const appointment = await appointmentService.updateAppointmentStatus(id, clinicId, status);

  sendSuccess(res, appointment, 'Appointment status updated successfully');
});
