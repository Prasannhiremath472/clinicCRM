import { Prescription, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ListPrescriptionsQuery, PrescriptionItemInput } from './prescription.types';

const MAX_CODE_GENERATION_ATTEMPTS = 3;

const SAFE_PATIENT_SELECT = {
  id: true,
  patientCode: true,
  firstName: true,
  lastName: true,
  mobileNumber: true,
  gender: true,
  dateOfBirth: true,
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
  qualification: true,
  specialization: true,
  signatureUrl: true,
  user: { select: SAFE_DOCTOR_USER_SELECT },
} satisfies Prisma.DoctorSelect;

export type SafePatient = Prisma.PatientGetPayload<{ select: typeof SAFE_PATIENT_SELECT }>;
export type SafeDoctor = Prisma.DoctorGetPayload<{ select: typeof SAFE_DOCTOR_SELECT }>;

export type PrescriptionWithDetails = Prescription & {
  patient: SafePatient;
  doctor: SafeDoctor;
  items: Prisma.PrescriptionItemGetPayload<true>[];
};

const DETAIL_INCLUDE = {
  patient: { select: SAFE_PATIENT_SELECT },
  doctor: { select: SAFE_DOCTOR_SELECT },
  items: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.PrescriptionInclude;

function findById(id: string, clinicId: string): Promise<PrescriptionWithDetails | null> {
  return prisma.prescription.findFirst({
    where: { id, consultation: { appointment: { clinicId } } },
    include: DETAIL_INCLUDE,
  });
}

function findByConsultationId(consultationId: string, clinicId: string): Promise<PrescriptionWithDetails | null> {
  return prisma.prescription.findFirst({
    where: { consultationId, consultation: { appointment: { clinicId } } },
    include: DETAIL_INCLUDE,
  });
}

function buildListWhere(clinicId: string, filters: ListPrescriptionsQuery): Prisma.PrescriptionWhereInput {
  const where: Prisma.PrescriptionWhereInput = {
    consultation: { appointment: { clinicId } },
  };

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
  filters: ListPrescriptionsQuery
): Promise<{ items: PrescriptionWithDetails[]; totalItems: number }> {
  const where = buildListWhere(clinicId, filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.prescription.findMany({
      where,
      include: DETAIL_INCLUDE,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      skip,
      take: filters.pageSize,
    }),
    prisma.prescription.count({ where }),
  ]);

  return { items, totalItems };
}

async function getNextSequenceForYear(year: number): Promise<number> {
  const count = await prisma.prescription.count({
    where: { prescriptionCode: { startsWith: `RX-${year}-` } },
  });
  return count + 1;
}

function buildPrescriptionCode(year: number, sequence: number): string {
  return `RX-${year}-${String(sequence).padStart(6, '0')}`;
}

async function generateUniquePrescriptionCode(): Promise<string> {
  const year = new Date().getFullYear();

  for (let attempt = 1; attempt <= MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const sequence = await getNextSequenceForYear(year);
    const prescriptionCode = buildPrescriptionCode(year, sequence);

    const existing = await prisma.prescription.findUnique({ where: { prescriptionCode } });
    if (!existing) {
      return prescriptionCode;
    }
  }

  throw new Error('Failed to generate a unique prescription code after multiple attempts');
}

export interface UpsertForConsultationData {
  consultationId: string;
  patientId: string;
  doctorId: string;
  prescriptionCode: string;
  notes?: string | null;
  items: PrescriptionItemInput[];
  pdfUrl?: string | null;
  qrCodeData?: string | null;
  isNew: boolean;
}

async function upsertForConsultation(data: UpsertForConsultationData): Promise<PrescriptionWithDetails> {
  const prescriptionId = await prisma.$transaction(async (tx) => {
    let prescription: Prescription;

    if (data.isNew) {
      prescription = await tx.prescription.create({
        data: {
          prescriptionCode: data.prescriptionCode,
          consultationId: data.consultationId,
          patientId: data.patientId,
          doctorId: data.doctorId,
          notes: data.notes ?? null,
          pdfUrl: data.pdfUrl ?? null,
          qrCodeData: data.qrCodeData ?? null,
        },
      });
    } else {
      const updated = await tx.prescription.update({
        where: { consultationId: data.consultationId },
        data: {
          notes: data.notes ?? null,
          pdfUrl: data.pdfUrl ?? null,
          qrCodeData: data.qrCodeData ?? null,
        },
      });
      prescription = updated;
    }

    await tx.prescriptionItem.deleteMany({ where: { prescriptionId: prescription.id } });

    if (data.items.length > 0) {
      await tx.prescriptionItem.createMany({
        data: data.items.map((item, index) => ({
          prescriptionId: prescription.id,
          medicineName: item.medicineName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions ?? null,
          sortOrder: item.sortOrder ?? index,
        })),
      });
    }

    return prescription.id;
  });

  const result = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: DETAIL_INCLUDE,
  });

  if (!result) {
    throw new Error('Failed to load prescription after upsert');
  }

  return result;
}

async function updatePdfUrl(id: string, pdfUrl: string | null): Promise<void> {
  await prisma.prescription.update({
    where: { id },
    data: { pdfUrl },
  });
}

export const prescriptionRepository = {
  findById,
  findByConsultationId,
  list,
  generateUniquePrescriptionCode,
  upsertForConsultation,
  updatePdfUrl,
};

export type PrescriptionRepository = typeof prescriptionRepository;
