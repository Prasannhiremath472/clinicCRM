import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppointmentStatus, Role } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  appointment: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  consultation: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  doctor: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { errorHandler } from '../src/middleware/errorHandler';
import { notFoundHandler } from '../src/middleware/notFoundHandler';
import { consultationRoutes } from '../src/modules/consultations/consultation.routes';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/consultations', consultationRoutes);
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
const DOCTOR_USER_UUID = 'user-doc-1';

function tokenFor(role: Role, clinicId: string | null = CLINIC_ID, sub = DOCTOR_USER_UUID): string {
  return jwt.sign(
    { sub, role, clinicId, email: 'staff@example.com' },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: '15m' }
  );
}

function makeAppointment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: APPOINTMENT_UUID,
    appointmentCode: 'APT-2026-000001',
    clinicId: CLINIC_ID,
    patientId: PATIENT_UUID,
    doctorId: DOCTOR_UUID,
    appointmentDate: new Date('2026-06-29'),
    startTime: '09:00',
    endTime: '09:15',
    status: AppointmentStatus.SCHEDULED,
    notes: null,
    cancelReason: null,
    createdById: 'user-1',
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
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
    isActive: true,
    user: { id: DOCTOR_USER_UUID, firstName: 'Greg', lastName: 'House', email: 'doc@x.com', phone: null },
    schedules: [],
    ...overrides,
  };
}

function makeConsultation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: CONSULTATION_UUID,
    appointmentId: APPOINTMENT_UUID,
    patientId: PATIENT_UUID,
    doctorId: DOCTOR_UUID,
    doctorUserId: DOCTOR_USER_UUID,
    heightCm: null,
    weightKg: null,
    bloodPressure: null,
    temperatureF: null,
    pulseRate: null,
    oxygenSaturation: null,
    symptoms: null,
    diagnosis: null,
    clinicalNotes: null,
    recommendedTests: null,
    treatmentPlan: null,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    patient: { id: PATIENT_UUID, patientCode: 'PT-2026-000001', firstName: 'John', lastName: 'Doe', mobileNumber: '9876543210' },
    doctor: { id: DOCTOR_UUID, doctorCode: 'DOC-000001', specialization: 'Cardiology', user: { id: DOCTOR_USER_UUID, firstName: 'Greg', lastName: 'House', email: 'doc@x.com', phone: null } },
    appointment: {
      id: APPOINTMENT_UUID,
      appointmentCode: 'APT-2026-000001',
      appointmentDate: new Date('2026-06-29'),
      startTime: '09:00',
      endTime: '09:15',
      status: AppointmentStatus.IN_CONSULTATION,
      type: 'WALK_IN',
    },
    ...overrides,
  };
}

describe('Consultations module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /consultations/start/:appointmentId', () => {
    it('starts a consultation successfully and transitions the appointment to IN_CONSULTATION', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(makeAppointment());
      prismaMock.consultation.findUnique.mockResolvedValueOnce(null);
      prismaMock.doctor.findFirst.mockResolvedValueOnce(makeDoctor());
      prismaMock.$transaction.mockImplementationOnce(async (cb: any) =>
        cb({
          consultation: { create: vi.fn().mockResolvedValueOnce(makeConsultation()) },
          appointment: { updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }) },
        })
      );
      prismaMock.consultation.findFirst.mockResolvedValueOnce(makeConsultation());

      const app = buildApp();
      const res = await request(app)
        .post(`/api/v1/consultations/start/${APPOINTMENT_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(CONSULTATION_UUID);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('blocks start when appointment is already completed', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(
        makeAppointment({ status: AppointmentStatus.COMPLETED })
      );

      const app = buildApp();
      const res = await request(app)
        .post(`/api/v1/consultations/start/${APPOINTMENT_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('blocks start when appointment is cancelled', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(
        makeAppointment({ status: AppointmentStatus.CANCELLED })
      );

      const app = buildApp();
      const res = await request(app)
        .post(`/api/v1/consultations/start/${APPOINTMENT_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('returns 409 when a consultation already exists for this appointment', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(makeAppointment());
      prismaMock.consultation.findUnique.mockResolvedValueOnce(makeConsultation());

      const app = buildApp();
      const res = await request(app)
        .post(`/api/v1/consultations/start/${APPOINTMENT_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(409);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('returns 404 when the appointment does not exist in this clinic', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .post(`/api/v1/consultations/start/${APPOINTMENT_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(404);
    });

    it('rejects RECEPTIONIST from starting a consultation with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .post(`/api/v1/consultations/start/${APPOINTMENT_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(403);
      expect(prismaMock.appointment.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /consultations/:id', () => {
    it('updates vitals and consultation fields successfully', async () => {
      prismaMock.consultation.findFirst.mockResolvedValueOnce(makeConsultation());
      prismaMock.consultation.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.consultation.findUnique.mockResolvedValueOnce(
        makeConsultation({ bloodPressure: '120/80', diagnosis: 'Common cold' })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/consultations/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ bloodPressure: '120/80', diagnosis: 'Common cold' });

      expect(res.status).toBe(200);
      expect(res.body.data.bloodPressure).toBe('120/80');
    });

    it('rejects an invalid blood pressure format', async () => {
      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/consultations/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ bloodPressure: 'not-a-bp' });

      expect(res.status).toBe(400);
      expect(prismaMock.consultation.findFirst).not.toHaveBeenCalled();
    });

    it('rejects an out-of-range temperature', async () => {
      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/consultations/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ temperatureF: 150 });

      expect(res.status).toBe(400);
      expect(prismaMock.consultation.findFirst).not.toHaveBeenCalled();
    });

    it('blocks update when the appointment is not in consultation', async () => {
      prismaMock.consultation.findFirst.mockResolvedValueOnce(
        makeConsultation({ appointment: { ...makeConsultation().appointment, status: AppointmentStatus.COMPLETED } })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/consultations/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ diagnosis: 'Too late' });

      expect(res.status).toBe(400);
      expect(prismaMock.consultation.updateMany).not.toHaveBeenCalled();
    });

    it('rejects RECEPTIONIST from updating a consultation with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/consultations/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ diagnosis: 'X' });

      expect(res.status).toBe(403);
      expect(prismaMock.consultation.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /consultations/:id/complete', () => {
    it('completes a consultation and transitions the appointment to COMPLETED', async () => {
      prismaMock.consultation.findFirst
        .mockResolvedValueOnce(makeConsultation())
        .mockResolvedValueOnce(
          makeConsultation({ appointment: { ...makeConsultation().appointment, status: AppointmentStatus.COMPLETED } })
        );
      prismaMock.$transaction.mockImplementationOnce(async (cb: any) =>
        cb({ appointment: { updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }) } })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/consultations/${CONSULTATION_UUID}/complete`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('COMPLETED');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('blocks complete when the appointment is not in consultation', async () => {
      prismaMock.consultation.findFirst.mockResolvedValueOnce(
        makeConsultation({ appointment: { ...makeConsultation().appointment, status: AppointmentStatus.SCHEDULED } })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/consultations/${CONSULTATION_UUID}/complete`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects RECEPTIONIST from completing a consultation with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/consultations/${CONSULTATION_UUID}/complete`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(403);
      expect(prismaMock.consultation.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('GET /consultations (visit history)', () => {
    it('lists consultations filtered by patientId, most recent first', async () => {
      prismaMock.consultation.findMany.mockResolvedValueOnce([makeConsultation()]);
      prismaMock.consultation.count.mockResolvedValueOnce(1);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/consultations')
        .query({ patientId: PATIENT_UUID })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(prismaMock.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            appointment: { clinicId: CLINIC_ID },
            patientId: PATIENT_UUID,
          }),
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('allows RECEPTIONIST to view a single consultation (read-only access)', async () => {
      prismaMock.consultation.findFirst.mockResolvedValueOnce(makeConsultation());

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/consultations/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(CONSULTATION_UUID);
    });
  });

  describe('Tenant isolation', () => {
    it('returns 404 when the consultation belongs to a different clinic', async () => {
      prismaMock.consultation.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/consultations/${CONSULTATION_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR, OTHER_CLINIC_ID)}`);

      expect(res.status).toBe(404);
      expect(prismaMock.consultation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ appointment: { clinicId: OTHER_CLINIC_ID } }),
        })
      );
    });
  });
});
