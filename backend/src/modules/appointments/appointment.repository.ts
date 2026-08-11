import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ListAppointmentsQuery } from './appointment.types';

const MAX_CODE_GENERATION_ATTEMPTS = 3;

const NON_OCCUPYING_STATUSES: AppointmentStatus[] = [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW];

const SAFE_PATIENT_SELECT = {
  id: true,
  patientCode: true,
  firstName: true,
  lastName: true,
  mobileNumber: true,
} satisfies Prisma.PatientSelect;

const SAFE_DOCTOR_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
} satisfies Prisma.UserSelect;

const SAFE_DOCTOR_SELECT = {
  id: true,
  doctorCode: true,
  specialization: true,
  consultationFee: true,
  user: { select: SAFE_DOCTOR_USER_SELECT },
} satisfies Prisma.DoctorSelect;

const SAFE_CREATED_BY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} satisfies Prisma.UserSelect;

export type SafePatient = Prisma.PatientGetPayload<{ select: typeof SAFE_PATIENT_SELECT }>;
export type SafeDoctor = Prisma.DoctorGetPayload<{ select: typeof SAFE_DOCTOR_SELECT }>;
export type SafeCreatedBy = Prisma.UserGetPayload<{ select: typeof SAFE_CREATED_BY_SELECT }>;

export type AppointmentWithDetails = Appointment & {
  patient: SafePatient;
  doctor: SafeDoctor;
  createdBy: SafeCreatedBy;
};

export interface CreateAppointmentData {
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  type: Appointment['type'];
  notes?: string | null;
}

export interface UpdateSlotData {
  appointmentDate: Date;
  startTime: string;
  endTime: string;
}

function findById(id: string, clinicId: string): Promise<AppointmentWithDetails | null> {
  return prisma.appointment.findFirst({
    where: { id, clinicId },
    include: {
      patient: { select: SAFE_PATIENT_SELECT },
      doctor: { select: SAFE_DOCTOR_SELECT },
      createdBy: { select: SAFE_CREATED_BY_SELECT },
    },
  });
}

function buildListWhere(clinicId: string, filters: ListAppointmentsQuery): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = { clinicId };

  if (filters.doctorId) {
    where.doctorId = filters.doctorId;
  }

  if (filters.patientId) {
    where.patientId = filters.patientId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.fromDate || filters.toDate) {
    where.appointmentDate = {
      ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
      ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
    };
  }

  return where;
}

function buildOrderBy(filters: ListAppointmentsQuery): Prisma.AppointmentOrderByWithRelationInput[] {
  return [{ [filters.sortBy]: filters.sortOrder }, { startTime: 'asc' }];
}

async function list(
  clinicId: string,
  filters: ListAppointmentsQuery
): Promise<{ items: AppointmentWithDetails[]; totalItems: number }> {
  const where = buildListWhere(clinicId, filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        patient: { select: SAFE_PATIENT_SELECT },
        doctor: { select: SAFE_DOCTOR_SELECT },
        createdBy: { select: SAFE_CREATED_BY_SELECT },
      },
      orderBy: buildOrderBy(filters),
      skip,
      take: filters.pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);

  return { items, totalItems };
}

function listForDoctorAndDate(
  doctorId: string,
  clinicId: string,
  date: Date,
  excludeAppointmentId?: string
): Promise<Pick<Appointment, 'id' | 'startTime' | 'endTime'>[]> {
  return prisma.appointment.findMany({
    where: {
      doctorId,
      clinicId,
      appointmentDate: date,
      status: { notIn: NON_OCCUPYING_STATUSES },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { id: true, startTime: true, endTime: true },
  });
}

async function getNextSequenceForYear(year: number): Promise<number> {
  const count = await prisma.appointment.count({
    where: { appointmentCode: { startsWith: `APT-${year}-` } },
  });
  return count + 1;
}

function buildAppointmentCode(year: number, sequence: number): string {
  return `APT-${year}-${String(sequence).padStart(6, '0')}`;
}

async function create(
  clinicId: string,
  data: CreateAppointmentData,
  createdById: string
): Promise<AppointmentWithDetails> {
  const year = new Date().getFullYear();

  for (let attempt = 1; attempt <= MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const sequence = await getNextSequenceForYear(year);
    const appointmentCode = buildAppointmentCode(year, sequence);

    try {
      return await prisma.appointment.create({
        data: {
          appointmentCode,
          clinicId,
          patientId: data.patientId,
          doctorId: data.doctorId,
          appointmentDate: data.appointmentDate,
          startTime: data.startTime,
          endTime: data.endTime,
          type: data.type,
          notes: data.notes ?? null,
          createdById,
        },
        include: {
          patient: { select: SAFE_PATIENT_SELECT },
          doctor: { select: SAFE_DOCTOR_SELECT },
          createdBy: { select: SAFE_CREATED_BY_SELECT },
        },
      });
    } catch (error) {
      const isUniqueConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

      if (isUniqueConflict && attempt < MAX_CODE_GENERATION_ATTEMPTS) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate a unique appointment code after multiple attempts');
}

async function updateSlot(
  id: string,
  clinicId: string,
  data: UpdateSlotData
): Promise<AppointmentWithDetails | null> {
  const { count } = await prisma.appointment.updateMany({
    where: { id, clinicId },
    data: {
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });

  if (count === 0) {
    return null;
  }

  return prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { select: SAFE_PATIENT_SELECT },
      doctor: { select: SAFE_DOCTOR_SELECT },
      createdBy: { select: SAFE_CREATED_BY_SELECT },
    },
  });
}

async function updateStatus(
  id: string,
  clinicId: string,
  status: AppointmentStatus,
  cancelReason?: string | null
): Promise<AppointmentWithDetails | null> {
  const { count } = await prisma.appointment.updateMany({
    where: { id, clinicId },
    data: {
      status,
      ...(cancelReason !== undefined ? { cancelReason } : {}),
    },
  });

  if (count === 0) {
    return null;
  }

  return prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { select: SAFE_PATIENT_SELECT },
      doctor: { select: SAFE_DOCTOR_SELECT },
      createdBy: { select: SAFE_CREATED_BY_SELECT },
    },
  });
}

export const appointmentRepository = {
  findById,
  list,
  listForDoctorAndDate,
  create,
  updateSlot,
  updateStatus,
};

export type AppointmentRepository = typeof appointmentRepository;
