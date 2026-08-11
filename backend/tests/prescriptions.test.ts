import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppointmentStatus, Role } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  consultation: {
    findFirst: vi.fn(),
  },
  doctor: {
    findFirst: vi.fn(),
  },
  patient: {
    findUnique: vi.fn(),
  },
  clinic: {
    findUnique: vi.fn(),
  },
  prescription: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  prescriptionItem: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('pdfkit', () => {
  return {
    default: class FakePDFDocument {
      page = { width: 595, height: 842, margins: { left: 50, right: 50, bottom: 50, top: 50 } };
      y = 50;
      private handlers: Record<string, ((arg?: unknown) => void)[]> = {};

      on(event: string, handler: (arg?: unknown) => void) {
        this.handlers[event] = this.handlers[event] ?? [];
        this.handlers[event].push(handler);
        return this;
      }

      fontSize() {
        return this;
      }

      font() {
        return this;
      }

      text() {
        return this;
      }

      moveDown() {
        return this;
      }

      moveTo() {
        return this;
      }

      lineTo() {
        return this;
      }

      lineWidth() {
        return this;
      }

      strokeColor() {
        return this;
      }

      stroke() {
        return this;
      }

      image() {
        return this;
      }

      heightOfString() {
        return 10;
      }

      end() {
        const dataHandlers = this.handlers.data ?? [];
        dataHandlers.forEach((handler) => handler(Buffer.from('fake-pdf')));
        const endHandlers = this.handlers.end ?? [];
        endHandlers.forEach((handler) => handler());
      }
    },
  };
});

vi.mock('qrcode', () => ({
  default: {
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-qr')),
  },
}));

const uploadStreamMock = vi.hoisted(() => vi.fn());

vi.mock('../src/lib/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: uploadStreamMock,
    },
  },
  get isCloudinaryConfigured() {
    return process.env.CLOUDINARY_CLOUD_NAME ? true : false;
  },
}));

import { errorHandler } from '../src/middleware/errorHandler';
import { notFoundHandler } from '../src/middleware/notFoundHandler';
import { prescriptionRoutes } from '../src/modules/prescriptions/prescription.routes';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/prescriptions', prescriptionRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const NOW = Date.now();
const CLINIC_ID = 'clinic-1';
const OTHER_CLINIC_ID = 'clinic-2';
const PATIENT_UUID = '123e4567-e89b-12d3-a456-426614174001';
const DOCTOR_UUID = '123e4567-e89b-12d3-a456-426614174002';
const APPOINTMENT_UUID = '123e4567-e89b-12d3-a456-426614174003';
const CONSULTATION_UUID = '123e4567-e89b-12d3-a456-426614174004';
const PRESCRIPTION_UUID = '123e4567-e89b-12d3-a456-426614174005';
const DOCTOR_USER_UUID = 'user-doc-1';

function tokenFor(role: Role, clinicId: string | null = CLINIC_ID, sub = DOCTOR_USER_UUID): string {
  return jwt.sign(
    { sub, role, clinicId, email: 'staff@example.com' },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: '15m' }
  );
}

function makeConsultation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: CONSULTATION_UUID,
    appointmentId: APPOINTMENT_UUID,
    patientId: PATIENT_UUID,
    doctorId: DOCTOR_UUID,
    doctorUserId: DOCTOR_USER_UUID,
    appointment: {
      id: APPOINTMENT_UUID,
      clinicId: CLINIC_ID,
      status: AppointmentStatus.IN_CONSULTATION,
    },
    ...overrides,
  };
}

function makeDoctor(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: DOCTOR_UUID,
    doctorCode: 'DOC-000001',
    clinicId: CLINIC_ID,
    userId: DOCTOR_USER_UUID,
    qualification: 'MBBS',
    specialization: 'Cardiology',
    experienceYears: 5,
    consultationFee: 500,
    signatureUrl: null,
    isActive: true,
    user: { id: DOCTOR_USER_UUID, firstName: 'Greg', lastName: 'House', email: 'doc@x.com', phone: null },
    schedules: [],
    ...overrides,
  };
}

function makePatient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: PATIENT_UUID,
    patientCode: 'PT-2026-000001',
    firstName: 'John',
    lastName: 'Doe',
    mobileNumber: '9876543210',
    gender: 'MALE',
    dateOfBirth: new Date('1990-01-01'),
    ...overrides,
  };
}

function makeClinic(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: CLINIC_ID,
    name: 'Test Clinic',
    address: '123 Main St',
    city: 'Bengaluru',
    state: 'KA',
    pincode: '560001',
    phone: '080-1234567',
    email: 'clinic@example.com',
    ...overrides,
  };
}

function makePrescription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: PRESCRIPTION_UUID,
    prescriptionCode: 'RX-2026-000001',
    consultationId: CONSULTATION_UUID,
    patientId: PATIENT_UUID,
    doctorId: DOCTOR_UUID,
    issuedDate: new Date(NOW),
    pdfUrl: null,
    qrCodeData: 'http://localhost:5173/verify-prescription/RX-2026-000001',
    notes: null,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    patient: makePatient(),
    doctor: { ...makeDoctor(), qualification: 'MBBS', specialization: 'Cardiology' },
    items: [
      {
        id: 'item-1',
        prescriptionId: PRESCRIPTION_UUID,
        medicineName: 'Paracetamol',
        dosage: '500mg',
        frequency: '1-0-1',
        duration: '5 days',
        instructions: null,
        sortOrder: 0,
      },
    ],
    ...overrides,
  };
}

const VALID_ITEMS = [
  { medicineName: 'Paracetamol', dosage: '500mg', frequency: '1-0-1', duration: '5 days' },
];

describe('Prescriptions module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.CLOUDINARY_CLOUD_NAME;

    uploadStreamMock.mockImplementation((_options: unknown, callback: (error: unknown, result: unknown) => void) => {
      callback(null, { secure_url: 'https://cloudinary.example/document.pdf' });
      return { end: vi.fn() };
    });
  });

  describe('PUT /prescriptions/by-consultation/:consultationId', () => {
    it('creates a new prescription, generates a code, and persists items', async () => {
      prismaMock.consultation.findFirst.mockResolvedValueOnce(makeConsultation());
      prismaMock.doctor.findFirst.mockResolvedValueOnce(makeDoctor());
      prismaMock.clinic.findUnique.mockResolvedValueOnce(makeClinic());
      prismaMock.patient.findUnique.mockResolvedValueOnce(makePatient());
      prismaMock.prescription.findFirst.mockResolvedValueOnce(null); // no existing
      prismaMock.prescription.count.mockResolvedValueOnce(0); // code generation sequence
      prismaMock.prescription.findUnique.mockResolvedValueOnce(null); // code uniqueness check

      prismaMock.$transaction.mockImplementationOnce(async (cb: any) =>
        cb({
          prescription: {
            create: vi.fn().mockResolvedValueOnce(makePrescription({ pdfUrl: null })),
          },
          prescriptionItem: {
            deleteMany: vi.fn().mockResolvedValueOnce({ count: 0 }),
            createMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
          },
        })
      );
      prismaMock.prescription.findUnique.mockResolvedValueOnce(makePrescription({ pdfUrl: null }));

      const app = buildApp();
      const res = await request(app)
        .put(`/api/v1/prescriptions/by-consultation/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ notes: 'Take rest', items: VALID_ITEMS });

      expect(res.status).toBe(200);
      expect(res.body.data.prescriptionCode).toBe('RX-2026-000001');
      expect(res.body.data.items).toHaveLength(1);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('updates an existing prescription, reuses the code, and replaces items', async () => {
      const existing = makePrescription();
      prismaMock.consultation.findFirst.mockResolvedValueOnce(makeConsultation());
      prismaMock.doctor.findFirst.mockResolvedValueOnce(makeDoctor());
      prismaMock.clinic.findUnique.mockResolvedValueOnce(makeClinic());
      prismaMock.patient.findUnique.mockResolvedValueOnce(makePatient());
      prismaMock.prescription.findFirst.mockResolvedValueOnce(existing);

      prismaMock.$transaction.mockImplementationOnce(async (cb: any) =>
        cb({
          prescription: {
            update: vi.fn().mockResolvedValueOnce({ ...existing, notes: 'Updated notes' }),
          },
          prescriptionItem: {
            deleteMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
            createMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
          },
        })
      );
      prismaMock.prescription.findUnique.mockResolvedValueOnce(
        makePrescription({ notes: 'Updated notes' })
      );

      const app = buildApp();
      const res = await request(app)
        .put(`/api/v1/prescriptions/by-consultation/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ notes: 'Updated notes', items: VALID_ITEMS });

      expect(res.status).toBe(200);
      expect(res.body.data.prescriptionCode).toBe('RX-2026-000001');
      expect(prismaMock.prescription.count).not.toHaveBeenCalled();
    });

    it('blocks saving when the appointment status disallows prescribing', async () => {
      prismaMock.consultation.findFirst.mockResolvedValueOnce(
        makeConsultation({ appointment: { id: APPOINTMENT_UUID, clinicId: CLINIC_ID, status: AppointmentStatus.SCHEDULED } })
      );

      const app = buildApp();
      const res = await request(app)
        .put(`/api/v1/prescriptions/by-consultation/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ items: VALID_ITEMS });

      expect(res.status).toBe(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an empty items array with a 400 validation error', async () => {
      const app = buildApp();
      const res = await request(app)
        .put(`/api/v1/prescriptions/by-consultation/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ items: [] });

      expect(res.status).toBe(400);
      expect(prismaMock.consultation.findFirst).not.toHaveBeenCalled();
    });

    it('rejects an item missing a required field with a 400 validation error', async () => {
      const app = buildApp();
      const res = await request(app)
        .put(`/api/v1/prescriptions/by-consultation/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ items: [{ medicineName: 'Paracetamol', dosage: '500mg', frequency: '1-0-1' }] });

      expect(res.status).toBe(400);
      expect(prismaMock.consultation.findFirst).not.toHaveBeenCalled();
    });

    it('rejects RECEPTIONIST from saving a prescription with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .put(`/api/v1/prescriptions/by-consultation/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ items: VALID_ITEMS });

      expect(res.status).toBe(403);
      expect(prismaMock.consultation.findFirst).not.toHaveBeenCalled();
    });

    it('skips PDF generation gracefully when Cloudinary is not configured (pdfUrl stays null)', async () => {
      prismaMock.consultation.findFirst.mockResolvedValueOnce(makeConsultation());
      prismaMock.doctor.findFirst.mockResolvedValueOnce(makeDoctor());
      prismaMock.clinic.findUnique.mockResolvedValueOnce(makeClinic());
      prismaMock.patient.findUnique.mockResolvedValueOnce(makePatient());
      prismaMock.prescription.findFirst.mockResolvedValueOnce(null);
      prismaMock.prescription.count.mockResolvedValueOnce(0);
      prismaMock.prescription.findUnique.mockResolvedValueOnce(null);

      prismaMock.$transaction.mockImplementationOnce(async (cb: any) =>
        cb({
          prescription: {
            create: vi.fn().mockResolvedValueOnce(makePrescription({ pdfUrl: null })),
          },
          prescriptionItem: {
            deleteMany: vi.fn().mockResolvedValueOnce({ count: 0 }),
            createMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
          },
        })
      );
      prismaMock.prescription.findUnique.mockResolvedValueOnce(makePrescription({ pdfUrl: null }));

      const app = buildApp();
      const res = await request(app)
        .put(`/api/v1/prescriptions/by-consultation/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ items: VALID_ITEMS });

      expect(res.status).toBe(200);
      expect(res.body.data.pdfUrl).toBeNull();
      expect(uploadStreamMock).not.toHaveBeenCalled();
    });
  });

  describe('GET /prescriptions (history)', () => {
    it('lists prescriptions filtered by patientId', async () => {
      prismaMock.prescription.findMany.mockResolvedValueOnce([makePrescription()]);
      prismaMock.prescription.count.mockResolvedValueOnce(1);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/prescriptions')
        .query({ patientId: PATIENT_UUID })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(prismaMock.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            consultation: { appointment: { clinicId: CLINIC_ID } },
            patientId: PATIENT_UUID,
          }),
        })
      );
    });

    it('allows RECEPTIONIST to view a single prescription (read-only access)', async () => {
      prismaMock.prescription.findFirst.mockResolvedValueOnce(makePrescription());

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/prescriptions/${PRESCRIPTION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(PRESCRIPTION_UUID);
    });
  });

  describe('Tenant isolation', () => {
    it('returns 404 when the prescription belongs to a different clinic', async () => {
      prismaMock.prescription.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/prescriptions/${PRESCRIPTION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR, OTHER_CLINIC_ID)}`);

      expect(res.status).toBe(404);
      expect(prismaMock.prescription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ consultation: { appointment: { clinicId: OTHER_CLINIC_ID } } }),
        })
      );
    });
  });
});
