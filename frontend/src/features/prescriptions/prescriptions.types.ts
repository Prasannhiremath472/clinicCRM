export interface PrescriptionPatient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  gender: string;
  dateOfBirth: string;
}

export interface PrescriptionDoctorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface PrescriptionDoctor {
  id: string;
  doctorCode: string;
  qualification: string;
  specialization: string;
  signatureUrl: string | null;
  user: PrescriptionDoctorUser;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  sortOrder: number;
}

export interface Prescription {
  id: string;
  prescriptionCode: string;
  consultationId: string;
  patientId: string;
  patient: PrescriptionPatient;
  doctorId: string;
  doctor: PrescriptionDoctor;
  issuedDate: string;
  pdfUrl: string | null;
  qrCodeData: string | null;
  notes: string | null;
  items: PrescriptionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ListPrescriptionsParams {
  page?: number;
  pageSize?: number;
  patientId?: string;
  doctorId?: string;
  sortBy?: "issuedDate" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PrescriptionItemPayload {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface SavePrescriptionPayload {
  notes?: string;
  items: PrescriptionItemPayload[];
}

export interface PrescriptionPdfResult {
  pdfUrl: string | null;
}
