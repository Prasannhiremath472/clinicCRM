import { DocumentType, Patient, PatientDocument } from '@prisma/client';
import { logger } from '../../config/logger';
import { isCloudinaryConfigured, cloudinary } from '../../lib/cloudinary';
import { ApiError } from '../../utils/ApiError';
import { buildPaginationMeta, PaginationMeta } from '../../utils/apiResponse';
import { patientRepository } from './patient.repository';
import { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from './patient.types';

export interface PatientWithAge extends Patient {
  age: number;
}

function computeAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return age;
}

function withAge<T extends Patient>(patient: T): T & { age: number } {
  return { ...patient, age: computeAge(patient.dateOfBirth) };
}

function normalizeOptionalString(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === '' ? null : value;
}

function toCreateData(input: CreatePatientInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    gender: input.gender,
    dateOfBirth: new Date(input.dateOfBirth),
    mobileNumber: input.mobileNumber,
    alternateMobile: normalizeOptionalString(input.alternateMobile) ?? null,
    email: normalizeOptionalString(input.email) ?? null,
    bloodGroup: input.bloodGroup,
    maritalStatus: input.maritalStatus,
    country: input.country ?? null,
    state: input.state ?? null,
    city: input.city ?? null,
    pincode: input.pincode ?? null,
    address: input.address ?? null,
    allergies: input.allergies ?? null,
    existingDiseases: input.existingDiseases ?? null,
    currentMedications: input.currentMedications ?? null,
    medicalHistory: input.medicalHistory ?? null,
    emergencyContactName: input.emergencyContactName ?? null,
    emergencyContactRelation: input.emergencyContactRelation ?? null,
    emergencyContactMobile: input.emergencyContactMobile ?? null,
  };
}

function toUpdateData(input: UpdatePatientInput) {
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }

    if (key === 'dateOfBirth') {
      data.dateOfBirth = new Date(value as string);
      continue;
    }

    if (
      [
        'alternateMobile',
        'email',
        'country',
        'state',
        'city',
        'pincode',
        'address',
        'allergies',
        'existingDiseases',
        'currentMedications',
        'medicalHistory',
        'emergencyContactName',
        'emergencyContactRelation',
        'emergencyContactMobile',
      ].includes(key)
    ) {
      data[key] = value === '' ? null : value;
      continue;
    }

    data[key] = value;
  }

  return data;
}

async function createPatient(clinicId: string, input: CreatePatientInput): Promise<PatientWithAge> {
  const patient = await patientRepository.create(clinicId, toCreateData(input));
  return withAge(patient);
}

async function getPatient(id: string, clinicId: string): Promise<PatientWithAge & { documents: PatientDocument[] }> {
  const patient = await patientRepository.findById(id, clinicId);

  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }

  return { ...withAge(patient), documents: patient.documents };
}

async function listPatients(
  clinicId: string,
  query: ListPatientsQuery
): Promise<{ items: PatientWithAge[]; meta: PaginationMeta }> {
  const { items, totalItems } = await patientRepository.list(clinicId, query);

  return {
    items: items.map(withAge),
    meta: buildPaginationMeta(query.page, query.pageSize, totalItems),
  };
}

async function updatePatient(id: string, clinicId: string, input: UpdatePatientInput): Promise<PatientWithAge> {
  const updated = await patientRepository.update(id, clinicId, toUpdateData(input));

  if (!updated) {
    throw ApiError.notFound('Patient not found');
  }

  return withAge(updated);
}

async function deletePatient(id: string, clinicId: string): Promise<void> {
  const deleted = await patientRepository.softDelete(id, clinicId);

  if (!deleted) {
    throw ApiError.notFound('Patient not found');
  }
}

function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

async function uploadDocument(
  patientId: string,
  clinicId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  type: DocumentType
): Promise<PatientDocument> {
  const patient = await patientRepository.findById(patientId, clinicId);

  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }

  if (!isCloudinaryConfigured) {
    throw ApiError.badRequest('File storage is not configured');
  }

  let uploadResult: { secure_url: string; public_id: string };

  try {
    uploadResult = await uploadBufferToCloudinary(file.buffer, `clinic-crm/patients/${patientId}/documents`);
  } catch (error) {
    logger.error('Cloudinary upload failed', { error, patientId });
    throw ApiError.internal('Failed to upload document. Please try again.');
  }

  return patientRepository.addDocument(patientId, {
    type,
    fileName: file.originalname,
    fileUrl: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  });
}

async function listPatientDocuments(patientId: string, clinicId: string): Promise<PatientDocument[]> {
  const patient = await patientRepository.findById(patientId, clinicId);

  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }

  return patientRepository.listDocuments(patientId);
}

async function deletePatientDocument(documentId: string, patientId: string, clinicId: string): Promise<void> {
  const patient = await patientRepository.findById(patientId, clinicId);

  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }

  const document = await patientRepository.findDocumentById(documentId, patientId);

  if (!document) {
    throw ApiError.notFound('Document not found');
  }

  if (document.publicId) {
    try {
      await cloudinary.uploader.destroy(document.publicId);
    } catch (error) {
      logger.error('Failed to delete document from Cloudinary (continuing with DB delete)', {
        error,
        publicId: document.publicId,
      });
    }
  }

  await patientRepository.deleteDocument(documentId);
}

export const patientService = {
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
  deletePatient,
  uploadDocument,
  listPatientDocuments,
  deletePatientDocument,
};
