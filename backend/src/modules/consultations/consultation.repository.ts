import { Consultation, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ListConsultationsQuery } from './consultation.types';

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
  user: { select: SAFE_DOCTOR_USER_SELECT },
} satisfies Prisma.DoctorSelect;

const SAFE_APPOINTMENT_SELECT = {
  id: true,
  appointmentCode: true,
  appointmentDate: true,
  startTime: true,
  endTime: true,
  status: true,
  type: true,
} satisfies Prisma.AppointmentSelect;

export type SafePatient = Prisma.PatientGetPayload<{ select: typeof SAFE_PATIENT_SELECT }>;
export type SafeDoctor = Prisma.DoctorGetPayload<{ select: typeof SAFE_DOCTOR_SELECT }>;
export type SafeAppointment = Prisma.AppointmentGetPayload<{ select: typeof SAFE_APPOINTMENT_SELECT }>;

export type ConsultationWithDetails = Consultation & {
  patient: SafePatient;
  doctor: SafeDoctor;
  appointment: SafeAppointment;
};

export interface CreateConsultationData {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  doctorUserId: string;
}

export interface UpdateConsultationData {
  heightCm?: number;
  weightKg?: number;
  bloodPressure?: string;
  temperatureF?: number;
  pulseRate?: number;
  oxygenSaturation?: number;
  symptoms?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  recommendedTests?: string;
  treatmentPlan?: string;
}

const DETAIL_INCLUDE = {
  patient: { select: SAFE_PATIENT_SELECT },
  doctor: { select: SAFE_DOCTOR_SELECT },
  appointment: { select: SAFE_APPOINTMENT_SELECT },
} satisfies Prisma.ConsultationInclude;

function findById(id: string, clinicId: string): Promise<ConsultationWithDetails | null> {
  return prisma.consultation.findFirst({
    where: { id, appointment: { clinicId } },
    include: DETAIL_INCLUDE,
  });
}

function findByAppointmentId(appointmentId: string, clinicId: string): Promise<ConsultationWithDetails | null> {
  return prisma.consultation.findFirst({
    where: { appointmentId, appointment: { clinicId } },
    include: DETAIL_INCLUDE,
  });
}

function buildListWhere(clinicId: string, filters: ListConsultationsQuery): Prisma.ConsultationWhereInput {
  const where: Prisma.ConsultationWhereInput = { appointment: { clinicId } };

  if (filters.patientId) {
    where.patientId = filters.patientId;
  }

  if (filters.doctorId) {
    where.doctorId = filters.doctorId;
  }

  return where;
}

async function list(
  clinicId: string,
  filters: ListConsultationsQuery
): Promise<{ items: ConsultationWithDetails[]; totalItems: number }> {
  const where = buildListWhere(clinicId, filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.consultation.findMany({
      where,
      include: DETAIL_INCLUDE,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      skip,
      take: filters.pageSize,
    }),
    prisma.consultation.count({ where }),
  ]);

  return { items, totalItems };
}

function createForAppointment(data: CreateConsultationData): Promise<Consultation> {
  return prisma.consultation.create({
    data: {
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      doctorId: data.doctorId,
      doctorUserId: data.doctorUserId,
    },
  });
}

async function update(id: string, data: UpdateConsultationData): Promise<ConsultationWithDetails | null> {
  const { count } = await prisma.consultation.updateMany({
    where: { id },
    data,
  });

  if (count === 0) {
    return null;
  }

  return prisma.consultation.findUnique({
    where: { id },
    include: DETAIL_INCLUDE,
  });
}

export const consultationRepository = {
  findById,
  findByAppointmentId,
  list,
  createForAppointment,
  update,
};

export type ConsultationRepository = typeof consultationRepository;
