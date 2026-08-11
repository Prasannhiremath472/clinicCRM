import { DocumentType, Patient, PatientDocument, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ListPatientsQuery } from './patient.types';

const MAX_CODE_GENERATION_ATTEMPTS = 3;

export interface CreatePatientData {
  firstName: string;
  lastName: string;
  gender: Patient['gender'];
  dateOfBirth: Date;
  mobileNumber: string;
  alternateMobile?: string | null;
  email?: string | null;
  bloodGroup?: Patient['bloodGroup'];
  maritalStatus?: Patient['maritalStatus'];
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  address?: string | null;
  allergies?: string | null;
  existingDiseases?: string | null;
  currentMedications?: string | null;
  medicalHistory?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelation?: string | null;
  emergencyContactMobile?: string | null;
}

export interface AddDocumentData {
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  publicId?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

function findById(id: string, clinicId: string): Promise<(Patient & { documents: PatientDocument[] }) | null> {
  return prisma.patient.findFirst({
    where: { id, clinicId, deletedAt: null },
    include: { documents: { orderBy: { uploadedAt: 'desc' } } },
  });
}

function findByCode(patientCode: string): Promise<Patient | null> {
  return prisma.patient.findUnique({ where: { patientCode } });
}

function buildListWhere(clinicId: string, filters: ListPatientsQuery): Prisma.PatientWhereInput {
  const where: Prisma.PatientWhereInput = {
    clinicId,
    deletedAt: null,
  };

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.gender) {
    where.gender = filters.gender;
  }

  if (filters.bloodGroup) {
    where.bloodGroup = filters.bloodGroup;
  }

  if (filters.search) {
    // MySQL's default collation (utf8mb4_general_ci/unicode_ci) is case-insensitive,
    // so `contains` here already performs a case-insensitive match without a `mode` option.
    where.OR = [
      { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } },
      { mobileNumber: { contains: filters.search } },
      { patientCode: { contains: filters.search } },
    ];
  }

  return where;
}

async function list(
  clinicId: string,
  filters: ListPatientsQuery
): Promise<{ items: Patient[]; totalItems: number }> {
  const where = buildListWhere(clinicId, filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      skip,
      take: filters.pageSize,
    }),
    prisma.patient.count({ where }),
  ]);

  return { items, totalItems };
}

async function getNextSequenceForYear(year: number): Promise<number> {
  const count = await prisma.patient.count({
    where: { patientCode: { startsWith: `PT-${year}-` } },
  });
  return count + 1;
}

function buildPatientCode(year: number, sequence: number): string {
  return `PT-${year}-${String(sequence).padStart(6, '0')}`;
}

async function create(clinicId: string, data: CreatePatientData): Promise<Patient> {
  const year = new Date().getFullYear();

  for (let attempt = 1; attempt <= MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const sequence = await getNextSequenceForYear(year);
    const patientCode = buildPatientCode(year, sequence);

    try {
      return await prisma.patient.create({
        data: {
          ...data,
          clinicId,
          patientCode,
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

  throw new Error('Failed to generate a unique patient code after multiple attempts');
}

async function update(id: string, clinicId: string, data: Prisma.PatientUpdateInput): Promise<Patient | null> {
  const { count } = await prisma.patient.updateMany({
    where: { id, clinicId, deletedAt: null },
    data,
  });

  if (count === 0) {
    return null;
  }

  return prisma.patient.findUnique({ where: { id } });
}

async function softDelete(id: string, clinicId: string): Promise<boolean> {
  const { count } = await prisma.patient.updateMany({
    where: { id, clinicId, deletedAt: null },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  return count > 0;
}

function addDocument(patientId: string, data: AddDocumentData): Promise<PatientDocument> {
  return prisma.patientDocument.create({
    data: {
      patientId,
      type: data.type,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      publicId: data.publicId ?? null,
      mimeType: data.mimeType ?? null,
      sizeBytes: data.sizeBytes ?? null,
    },
  });
}

function listDocuments(patientId: string): Promise<PatientDocument[]> {
  return prisma.patientDocument.findMany({
    where: { patientId },
    orderBy: { uploadedAt: 'desc' },
  });
}

function findDocumentById(id: string, patientId: string): Promise<PatientDocument | null> {
  return prisma.patientDocument.findFirst({ where: { id, patientId } });
}

function deleteDocument(id: string): Promise<PatientDocument> {
  return prisma.patientDocument.delete({ where: { id } });
}

export const patientRepository = {
  findById,
  findByCode,
  list,
  create,
  update,
  softDelete,
  addDocument,
  listDocuments,
  findDocumentById,
  deleteDocument,
};

export type PatientRepository = typeof patientRepository;
