import { FollowUp, FollowUpStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ListFollowUpsQuery } from './followup.types';

const SAFE_PATIENT_SELECT = {
  id: true,
  patientCode: true,
  firstName: true,
  lastName: true,
  mobileNumber: true,
} satisfies Prisma.PatientSelect;

const SAFE_APPOINTMENT_SELECT = {
  id: true,
  appointmentCode: true,
  appointmentDate: true,
  startTime: true,
} satisfies Prisma.AppointmentSelect;

const SAFE_CREATED_BY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} satisfies Prisma.UserSelect;

export type SafePatient = Prisma.PatientGetPayload<{ select: typeof SAFE_PATIENT_SELECT }>;
export type SafeAppointment = Prisma.AppointmentGetPayload<{ select: typeof SAFE_APPOINTMENT_SELECT }>;
export type SafeCreatedBy = Prisma.UserGetPayload<{ select: typeof SAFE_CREATED_BY_SELECT }>;

export type FollowUpWithDetails = FollowUp & {
  patient: SafePatient;
  appointment: SafeAppointment | null;
  createdBy: SafeCreatedBy;
};

const DETAIL_INCLUDE = {
  patient: { select: SAFE_PATIENT_SELECT },
  appointment: { select: SAFE_APPOINTMENT_SELECT },
  createdBy: { select: SAFE_CREATED_BY_SELECT },
} satisfies Prisma.FollowUpInclude;

const ACTIONABLE_STATUSES: FollowUpStatus[] = [FollowUpStatus.PENDING, FollowUpStatus.SENT];

export interface CreateFollowUpData {
  patientId: string;
  appointmentId?: string | null;
  followUpDate: Date;
  reason: string;
}

export interface UpdateFollowUpData {
  followUpDate?: Date;
  reason?: string;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function findById(id: string, clinicId: string): Promise<FollowUpWithDetails | null> {
  return prisma.followUp.findFirst({
    where: { id, clinicId },
    include: DETAIL_INCLUDE,
  });
}

function buildListWhere(clinicId: string, filters: ListFollowUpsQuery): Prisma.FollowUpWhereInput {
  const where: Prisma.FollowUpWhereInput = { clinicId };

  if (filters.patientId) {
    where.patientId = filters.patientId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.fromDate || filters.toDate) {
    where.followUpDate = {
      ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
      ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
    };
  }

  return where;
}

async function list(
  clinicId: string,
  filters: ListFollowUpsQuery
): Promise<{ items: FollowUpWithDetails[]; totalItems: number }> {
  const where = buildListWhere(clinicId, filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.followUp.findMany({
      where,
      include: DETAIL_INCLUDE,
      orderBy: [{ [filters.sortBy]: filters.sortOrder }],
      skip,
      take: filters.pageSize,
    }),
    prisma.followUp.count({ where }),
  ]);

  return { items, totalItems };
}

function create(clinicId: string, data: CreateFollowUpData, createdById: string): Promise<FollowUpWithDetails> {
  return prisma.followUp.create({
    data: {
      clinicId,
      patientId: data.patientId,
      appointmentId: data.appointmentId ?? null,
      followUpDate: data.followUpDate,
      reason: data.reason,
      status: FollowUpStatus.PENDING,
      createdById,
    },
    include: DETAIL_INCLUDE,
  });
}

async function update(
  id: string,
  clinicId: string,
  data: UpdateFollowUpData
): Promise<FollowUpWithDetails | null> {
  const { count } = await prisma.followUp.updateMany({
    where: { id, clinicId },
    data: {
      ...(data.followUpDate !== undefined ? { followUpDate: data.followUpDate } : {}),
      ...(data.reason !== undefined ? { reason: data.reason } : {}),
    },
  });

  if (count === 0) {
    return null;
  }

  return prisma.followUp.findUnique({ where: { id }, include: DETAIL_INCLUDE });
}

async function updateStatus(
  id: string,
  clinicId: string,
  status: FollowUpStatus,
  reminderSentAt?: Date | null
): Promise<FollowUpWithDetails | null> {
  const { count } = await prisma.followUp.updateMany({
    where: { id, clinicId },
    data: {
      status,
      ...(reminderSentAt !== undefined ? { reminderSentAt } : {}),
    },
  });

  if (count === 0) {
    return null;
  }

  return prisma.followUp.findUnique({ where: { id }, include: DETAIL_INCLUDE });
}

function getUpcoming(clinicId: string, limit: number): Promise<FollowUpWithDetails[]> {
  return prisma.followUp.findMany({
    where: {
      clinicId,
      status: { in: ACTIONABLE_STATUSES },
      followUpDate: { gte: startOfToday() },
    },
    include: DETAIL_INCLUDE,
    orderBy: [{ followUpDate: 'asc' }],
    take: limit,
  });
}

function getOverdue(clinicId: string, limit: number): Promise<FollowUpWithDetails[]> {
  return prisma.followUp.findMany({
    where: {
      clinicId,
      status: { in: ACTIONABLE_STATUSES },
      followUpDate: { lt: startOfToday() },
    },
    include: DETAIL_INCLUDE,
    orderBy: [{ followUpDate: 'asc' }],
    take: limit,
  });
}

export const followUpRepository = {
  findById,
  list,
  create,
  update,
  updateStatus,
  getUpcoming,
  getOverdue,
};

export type FollowUpRepository = typeof followUpRepository;
