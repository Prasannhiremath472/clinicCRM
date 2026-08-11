import { FollowUpStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { buildPaginationMeta, PaginationMeta } from '../../utils/apiResponse';
import { sendSms } from '../notifications/notification.service';
import { patientRepository } from '../patients/patient.repository';
import { FollowUpWithDetails, followUpRepository, SafePatient } from './followup.repository';
import { CreateFollowUpInput, ListFollowUpsQuery, UpdateFollowUpInput } from './followup.types';

export type FollowUpWithComputed = FollowUpWithDetails & { isOverdue: boolean };

const DASHBOARD_LIST_LIMIT = 10;

/**
 * Forward-only status transition map. Each key lists the states that may be reached
 * from it. Terminal states (DONE, CANCELLED) map to an empty array.
 */
export const FOLLOWUP_STATUS_TRANSITIONS: Record<FollowUpStatus, FollowUpStatus[]> = {
  [FollowUpStatus.PENDING]: [
    FollowUpStatus.SENT,
    FollowUpStatus.DONE,
    FollowUpStatus.OVERDUE,
    FollowUpStatus.CANCELLED,
  ],
  [FollowUpStatus.SENT]: [FollowUpStatus.DONE, FollowUpStatus.CANCELLED, FollowUpStatus.OVERDUE],
  [FollowUpStatus.OVERDUE]: [FollowUpStatus.DONE, FollowUpStatus.CANCELLED, FollowUpStatus.SENT],
  [FollowUpStatus.DONE]: [],
  [FollowUpStatus.CANCELLED]: [],
};

export function isValidStatusTransition(current: FollowUpStatus, next: FollowUpStatus): boolean {
  return FOLLOWUP_STATUS_TRANSITIONS[current].includes(next);
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function computeIsOverdue(followUp: { followUpDate: Date; status: FollowUpStatus }): boolean {
  const followUpDate = new Date(followUp.followUpDate);
  followUpDate.setHours(0, 0, 0, 0);

  return (
    followUpDate.getTime() < startOfToday().getTime() &&
    (followUp.status === FollowUpStatus.PENDING || followUp.status === FollowUpStatus.SENT)
  );
}

function withIsOverdue<T extends FollowUpWithDetails>(followUp: T): T & { isOverdue: boolean } {
  return { ...followUp, isOverdue: computeIsOverdue(followUp) };
}

async function ensurePatientBelongsToClinic(patientId: string, clinicId: string): Promise<void> {
  const patient = await patientRepository.findById(patientId, clinicId);
  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }
}

async function ensureAppointmentBelongsToClinic(appointmentId: string, clinicId: string): Promise<void> {
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, clinicId } });
  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }
}

/**
 * Sends the reminder notification for a follow-up via SMS (the integration-ready channel
 * available in this phase) referencing the patient's name, follow-up date, and reason.
 */
async function dispatchReminder(followUpDate: Date, reason: string, patient: SafePatient): Promise<void> {
  const formattedDate = followUpDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const message = `Hi ${patient.firstName}, this is a reminder for your follow-up on ${formattedDate} regarding: ${reason}. Please visit us at your earliest convenience.`;

  await sendSms(patient.mobileNumber, message);
}

async function createFollowUp(
  clinicId: string,
  createdById: string,
  input: CreateFollowUpInput
): Promise<FollowUpWithComputed> {
  await ensurePatientBelongsToClinic(input.patientId, clinicId);

  if (input.appointmentId) {
    await ensureAppointmentBelongsToClinic(input.appointmentId, clinicId);
  }

  const followUp = await followUpRepository.create(
    clinicId,
    {
      patientId: input.patientId,
      appointmentId: input.appointmentId ?? null,
      followUpDate: new Date(input.followUpDate),
      reason: input.reason,
    },
    createdById
  );

  return withIsOverdue(followUp);
}

async function getFollowUp(id: string, clinicId: string): Promise<FollowUpWithComputed> {
  const followUp = await followUpRepository.findById(id, clinicId);

  if (!followUp) {
    throw ApiError.notFound('Follow-up not found');
  }

  return withIsOverdue(followUp);
}

async function listFollowUps(
  clinicId: string,
  query: ListFollowUpsQuery
): Promise<{ items: FollowUpWithComputed[]; meta: PaginationMeta }> {
  const { items, totalItems } = await followUpRepository.list(clinicId, query);

  return {
    items: items.map(withIsOverdue),
    meta: buildPaginationMeta(query.page, query.pageSize, totalItems),
  };
}

async function updateFollowUp(
  id: string,
  clinicId: string,
  input: UpdateFollowUpInput
): Promise<FollowUpWithComputed> {
  const existing = await followUpRepository.findById(id, clinicId);

  if (!existing) {
    throw ApiError.notFound('Follow-up not found');
  }

  if (existing.status !== FollowUpStatus.PENDING) {
    throw ApiError.badRequest('Cannot edit a follow-up that has already been actioned');
  }

  const updated = await followUpRepository.update(id, clinicId, {
    ...(input.followUpDate !== undefined ? { followUpDate: new Date(input.followUpDate) } : {}),
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  });

  if (!updated) {
    throw ApiError.notFound('Follow-up not found');
  }

  return withIsOverdue(updated);
}

async function updateFollowUpStatus(
  id: string,
  clinicId: string,
  newStatus: FollowUpStatus
): Promise<FollowUpWithComputed> {
  const existing = await followUpRepository.findById(id, clinicId);

  if (!existing) {
    throw ApiError.notFound('Follow-up not found');
  }

  if (!isValidStatusTransition(existing.status, newStatus)) {
    throw ApiError.badRequest(`Cannot change status from ${existing.status} to ${newStatus}`);
  }

  if (newStatus === FollowUpStatus.SENT) {
    await dispatchReminder(existing.followUpDate, existing.reason, existing.patient);
  }

  const updated = await followUpRepository.updateStatus(
    id,
    clinicId,
    newStatus,
    newStatus === FollowUpStatus.SENT ? new Date() : undefined
  );

  if (!updated) {
    throw ApiError.notFound('Follow-up not found');
  }

  return withIsOverdue(updated);
}

async function cancelFollowUp(id: string, clinicId: string): Promise<FollowUpWithComputed> {
  return updateFollowUpStatus(id, clinicId, FollowUpStatus.CANCELLED);
}

async function getDashboardSummary(
  clinicId: string
): Promise<{ upcoming: FollowUpWithComputed[]; overdue: FollowUpWithComputed[] }> {
  const [upcoming, overdue] = await Promise.all([
    followUpRepository.getUpcoming(clinicId, DASHBOARD_LIST_LIMIT),
    followUpRepository.getOverdue(clinicId, DASHBOARD_LIST_LIMIT),
  ]);

  return {
    upcoming: upcoming.map(withIsOverdue),
    overdue: overdue.map(withIsOverdue),
  };
}

export const followUpService = {
  createFollowUp,
  getFollowUp,
  listFollowUps,
  updateFollowUp,
  updateFollowUpStatus,
  cancelFollowUp,
  getDashboardSummary,
};
