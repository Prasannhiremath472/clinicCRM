import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { dashboardService } from './dashboard.service';
import { DashboardQuery } from './dashboard.types';

/**
 * clinicId is guaranteed non-null here because every dashboard route is gated by
 * authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST') at the router level, and
 * SUPER_ADMIN (the only role with a null clinicId) is excluded from that list.
 * This helper exists for defense in depth in case that invariant ever breaks.
 */
function getClinicId(req: Request): string {
  if (!req.user?.clinicId) {
    throw ApiError.forbidden('A clinic context is required to access dashboard data');
  }
  return req.user.clinicId;
}

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);

  const summary = await dashboardService.getDashboardSummary(clinicId);

  sendSuccess(res, summary, 'Dashboard summary fetched successfully');
});

export const getTrends = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as DashboardQuery;

  const trends = await dashboardService.getTrends(clinicId, query);

  sendSuccess(res, trends, 'Dashboard trends fetched successfully');
});

export const getRecentActivity = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);

  const activity = await dashboardService.getRecentActivity(clinicId);

  sendSuccess(res, activity, 'Recent activity fetched successfully');
});
