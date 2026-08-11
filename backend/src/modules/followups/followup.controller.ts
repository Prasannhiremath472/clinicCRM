import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { followUpService } from './followup.service';
import {
  CreateFollowUpInput,
  FollowUpIdParams,
  ListFollowUpsQuery,
  UpdateFollowUpInput,
  UpdateStatusInput,
} from './followup.types';

/**
 * clinicId is guaranteed non-null here because every follow-up route is gated by
 * authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST') at the router level, and
 * SUPER_ADMIN (the only role with a null clinicId) is excluded from that list.
 * This helper exists for defense in depth in case that invariant ever breaks.
 */
function getClinicId(req: Request): string {
  if (!req.user?.clinicId) {
    throw ApiError.forbidden('A clinic context is required to access follow-up records');
  }
  return req.user.clinicId;
}

export const listFollowUps = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ListFollowUpsQuery;

  const { items, meta } = await followUpService.listFollowUps(clinicId, query);

  sendSuccess(res, items, 'Follow-ups fetched successfully', 200, meta);
});

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);

  const summary = await followUpService.getDashboardSummary(clinicId);

  sendSuccess(res, summary, 'Follow-up dashboard fetched successfully');
});

export const getFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as FollowUpIdParams;

  const followUp = await followUpService.getFollowUp(id, clinicId);

  sendSuccess(res, followUp, 'Follow-up fetched successfully');
});

export const createFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const createdById = req.user!.id;
  const input = req.body as CreateFollowUpInput;

  const followUp = await followUpService.createFollowUp(clinicId, createdById, input);

  sendSuccess(res, followUp, 'Follow-up created successfully', 201);
});

export const updateFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as FollowUpIdParams;
  const input = req.body as UpdateFollowUpInput;

  const followUp = await followUpService.updateFollowUp(id, clinicId, input);

  sendSuccess(res, followUp, 'Follow-up updated successfully');
});

export const updateFollowUpStatus = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as FollowUpIdParams;
  const { status } = req.body as UpdateStatusInput;

  const followUp = await followUpService.updateFollowUpStatus(id, clinicId, status);

  sendSuccess(res, followUp, 'Follow-up status updated successfully');
});
