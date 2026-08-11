import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { doctorService } from './doctor.service';
import {
  AvailabilityQuery,
  CreateDoctorInput,
  CreateLeaveInput,
  DoctorIdParams,
  DoctorLeaveParams,
  ListDoctorsQuery,
  ListLeavesQuery,
  UpdateDoctorInput,
  UpsertScheduleInput,
} from './doctor.types';

/**
 * clinicId is guaranteed non-null here because every doctor route is gated by
 * authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST') at the router level, and
 * SUPER_ADMIN (the only role with a null clinicId) is excluded from that list.
 * This helper exists for defense in depth in case that invariant ever breaks.
 */
function getClinicId(req: Request): string {
  if (!req.user?.clinicId) {
    throw ApiError.forbidden('A clinic context is required to access doctor records');
  }
  return req.user.clinicId;
}

export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ListDoctorsQuery;

  const { items, meta } = await doctorService.listDoctors(clinicId, query);

  sendSuccess(res, items, 'Doctors fetched successfully', 200, meta);
});

export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const input = req.body as CreateDoctorInput;

  const doctor = await doctorService.createDoctor(clinicId, input);

  sendSuccess(res, doctor, 'Doctor created successfully', 201);
});

export const getMyDoctorProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const doctor = await doctorService.getMyDoctorProfile(userId);

  sendSuccess(res, doctor, 'Doctor profile fetched successfully');
});

export const getDoctor = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as DoctorIdParams;

  const doctor = await doctorService.getDoctor(id, clinicId);

  sendSuccess(res, doctor, 'Doctor fetched successfully');
});

export const updateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as DoctorIdParams;
  const input = req.body as UpdateDoctorInput;

  const doctor = await doctorService.updateDoctor(id, clinicId, input);

  sendSuccess(res, doctor, 'Doctor updated successfully');
});

export const deactivateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as DoctorIdParams;

  await doctorService.deactivateDoctor(id, clinicId);

  sendSuccess(res, null, 'Doctor deactivated successfully');
});

export const getSchedule = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as DoctorIdParams;

  const schedules = await doctorService.getSchedule(id, clinicId);

  sendSuccess(res, schedules, 'Schedule fetched successfully');
});

export const setSchedule = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as DoctorIdParams;
  const { schedules } = req.body as UpsertScheduleInput;

  const updated = await doctorService.setSchedule(id, clinicId, schedules);

  sendSuccess(res, updated, 'Schedule updated successfully');
});

export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as DoctorIdParams;
  const { date } = req.query as unknown as AvailabilityQuery;

  const availability = await doctorService.getAvailability(id, clinicId, date);

  sendSuccess(res, availability, 'Availability fetched successfully');
});

export const listLeaves = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as DoctorIdParams;
  const query = req.query as unknown as ListLeavesQuery;

  const leaves = await doctorService.listLeaves(id, clinicId, query);

  sendSuccess(res, leaves, 'Leaves fetched successfully');
});

export const createLeave = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as DoctorIdParams;
  const input = req.body as CreateLeaveInput;

  const leave = await doctorService.addLeave(id, clinicId, input);

  sendSuccess(res, leave, 'Leave added successfully', 201);
});

export const deleteLeave = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id, leaveId } = req.params as unknown as DoctorLeaveParams;

  await doctorService.removeLeave(leaveId, id, clinicId);

  sendSuccess(res, null, 'Leave removed successfully');
});
