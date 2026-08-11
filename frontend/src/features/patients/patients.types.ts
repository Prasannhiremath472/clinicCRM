export type Gender = "MALE" | "FEMALE" | "OTHER";

export type BloodGroup =
  | "A_POSITIVE"
  | "A_NEGATIVE"
  | "B_POSITIVE"
  | "B_NEGATIVE"
  | "AB_POSITIVE"
  | "AB_NEGATIVE"
  | "O_POSITIVE"
  | "O_NEGATIVE"
  | "UNKNOWN";

export type MaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "OTHER";

export type DocumentType =
  | "LAB_REPORT"
  | "SCAN"
  | "PRESCRIPTION_UPLOAD"
  | "ID_PROOF"
  | "INSURANCE"
  | "OTHER";

export interface PatientDocument {
  id: string;
  patientId: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  publicId: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
}

export interface Patient {
  id: string;
  patientCode: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  mobileNumber: string;
  alternateMobile: string | null;
  email: string | null;
  bloodGroup: BloodGroup | null;
  maritalStatus: MaritalStatus | null;
  country: string | null;
  state: string | null;
  city: string | null;
  pincode: string | null;
  address: string | null;
  allergies: string | null;
  existingDiseases: string | null;
  currentMedications: string | null;
  medicalHistory: string | null;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactMobile: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Derived on the backend from dateOfBirth; not stored. */
  age: number;
}

export interface PatientWithDocuments extends Patient {
  documents: PatientDocument[];
}

export interface ListPatientsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  isActive?: boolean;
  sortBy?: "createdAt" | "firstName" | "dateOfBirth";
  sortOrder?: "asc" | "desc";
}

export interface CreatePatientPayload {
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  mobileNumber: string;
  alternateMobile?: string;
  email?: string;
  bloodGroup?: BloodGroup;
  maritalStatus?: MaritalStatus;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  address?: string;
  allergies?: string;
  existingDiseases?: string;
  currentMedications?: string;
  medicalHistory?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactMobile?: string;
}

export type UpdatePatientPayload = Partial<CreatePatientPayload>;
