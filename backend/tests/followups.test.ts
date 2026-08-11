import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { FollowUpStatus, Role } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  followUp: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  patient: {
    findFirst: vi.fn(),
  },
  appointment: {
    findFirst: vi.fn(),
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

const notificationMock = vi.hoisted(() => ({
  sendSms: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
  sendWhatsApp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/modules/notifications/notification.service', () => notificationMock);

import { errorHandler } from '../src/middleware/errorHandler';
import { notFoundHandler } from '../src/middleware/notFoundHandler';
import { followUpRoutes } from '../src/modules/followups/followup.routes';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/follow-ups', followUpRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const NOW = Date.now();
const CLINIC_ID = 'clinic-1';
const OTHER_CLINIC_ID = 'clinic-2';
const PATIENT_UUID = '123e4567-e89b-12d3-a456-426614174001';
const APPOINTMENT_UUID = '123e4567-e89b-12d3-a456-426614174002';
const FOLLOWUP_UUID = '123e4567-e89b-12d3-a456-426614174003';

// Far enough in the future to never be "in the past" relative to test run time.
const FUTURE_DATE = '2026-12-15';
const PAST_DATE = '2026-01-01';

function tokenFor(role: Role, clinicId: string | null = CLINIC_ID, sub = 'user-1'): string {
  return jwt.sign(
    { sub, role, clinicId, email: 'staff@example.com' },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: '15m' }
  );
}

function makePatient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: PATIENT_UUID,
    patientCode: 'PT-2026-000001',
    clinicId: CLINIC_ID,
    firstName: 'John',
    lastName: 'Doe',
    mobileNumber: '9876543210',
    deletedAt: null,
    documents: [],
    ...overrides,
  };
}

function makeAppointment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: APPOINTMENT_UUID,
    appointmentCode: 'APT-2026-000001',
    clinicId: CLINIC_ID,
    ...overrides,
  };
}

function makeFollowUp(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: FOLLOWUP_UUID,
    clinicId: CLINIC_ID,
    patientId: PATIENT_UUID,
    patient: { id: PATIENT_UUID, patientCode: 'PT-2026-000001', firstName: 'John', lastName: 'Doe', mobileNumber: '9876543210' },
    appointmentId: null,
    appointment: null,
    followUpDate: new Date(FUTURE_DATE),
    reason: 'Review blood test results',
    status: FollowUpStatus.PENDING,
    reminderSentAt: null,
    createdById: 'user-1',
    createdBy: { id: 'user-1', firstName: 'Staff', lastName: 'One', role: Role.RECEPTIONIST },
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  };
}

describe('Follow-ups module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    notificationMock.sendSms.mockResolvedValue(undefined);
    notificationMock.sendEmail.mockResolvedValue(undefined);
    notificationMock.sendWhatsApp.mockResolvedValue(undefined);
  });

  describe('POST /follow-ups', () => {
    const validPayload = {
      patientId: PATIENT_UUID,
      followUpDate: FUTURE_DATE,
      reason: 'Review blood test results',
    };

    it('creates a follow-up successfully', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(makePatient());
      prismaMock.followUp.create.mockResolvedValueOnce(makeFollowUp());

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/follow-ups')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.isOverdue).toBe(false);
      expect(prismaMock.followUp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ patientId: PATIENT_UUID, reason: validPayload.reason }),
        })
      );
    });

    it('rejects creation with a past follow-up date (400)', async () => {
      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/follow-ups')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ ...validPayload, followUpDate: PAST_DATE });

      expect(res.status).toBe(400);
      expect(prismaMock.patient.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.followUp.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the patient does not belong to this clinic', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/follow-ups')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send(validPayload);

      expect(res.status).toBe(404);
      expect(prismaMock.followUp.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the linked appointment does not belong to this clinic', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(makePatient());
      prismaMock.appointment.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/follow-ups')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ ...validPayload, appointmentId: APPOINTMENT_UUID });

      expect(res.status).toBe(404);
      expect(prismaMock.followUp.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /follow-ups/:id', () => {
    it('updates a PENDING follow-up successfully', async () => {
      prismaMock.followUp.findFirst.mockResolvedValueOnce(makeFollowUp());
      prismaMock.followUp.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.followUp.findUnique.mockResolvedValueOnce(
        makeFollowUp({ reason: 'Updated reason' })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/follow-ups/${FOLLOWUP_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ reason: 'Updated reason' });

      expect(res.status).toBe(200);
      expect(res.body.data.reason).toBe('Updated reason');
    });

    it('blocks editing once the follow-up is no longer PENDING (400)', async () => {
      prismaMock.followUp.findFirst.mockResolvedValueOnce(
        makeFollowUp({ status: FollowUpStatus.SENT })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/follow-ups/${FOLLOWUP_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ reason: 'Updated reason' });

      expect(res.status).toBe(400);
      expect(prismaMock.followUp.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /follow-ups/:id/status', () => {
    it('allows PENDING -> SENT and dispatches an SMS reminder', async () => {
      prismaMock.followUp.findFirst.mockResolvedValueOnce(makeFollowUp());
      prismaMock.followUp.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.followUp.findUnique.mockResolvedValueOnce(
        makeFollowUp({ status: FollowUpStatus.SENT, reminderSentAt: new Date(NOW) })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/follow-ups/${FOLLOWUP_UUID}/status`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ status: 'SENT' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SENT');
      expect(notificationMock.sendSms).toHaveBeenCalledWith(
        '9876543210',
        expect.stringContaining('John')
      );
      expect(notificationMock.sendSms).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Review blood test results')
      );
      expect(prismaMock.followUp.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT', reminderSentAt: expect.any(Date) }),
        })
      );
    });

    it('rejects an invalid transition (DONE -> PENDING) with 400', async () => {
      prismaMock.followUp.findFirst.mockResolvedValueOnce(
        makeFollowUp({ status: FollowUpStatus.DONE })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/follow-ups/${FOLLOWUP_UUID}/status`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ status: 'PENDING' });

      expect(res.status).toBe(400);
      expect(prismaMock.followUp.updateMany).not.toHaveBeenCalled();
      expect(notificationMock.sendSms).not.toHaveBeenCalled();
    });

    it('cancels a PENDING follow-up successfully', async () => {
      prismaMock.followUp.findFirst.mockResolvedValueOnce(makeFollowUp());
      prismaMock.followUp.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.followUp.findUnique.mockResolvedValueOnce(
        makeFollowUp({ status: FollowUpStatus.CANCELLED })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/follow-ups/${FOLLOWUP_UUID}/status`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('rejects cancelling a DONE follow-up (400)', async () => {
      prismaMock.followUp.findFirst.mockResolvedValueOnce(
        makeFollowUp({ status: FollowUpStatus.DONE })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/follow-ups/${FOLLOWUP_UUID}/status`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(400);
      expect(prismaMock.followUp.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('GET /follow-ups', () => {
    it('computes isOverdue correctly for past-dated PENDING vs future-dated items', async () => {
      prismaMock.followUp.findMany.mockResolvedValueOnce([
        makeFollowUp({ id: 'fu-past', followUpDate: new Date(PAST_DATE), status: FollowUpStatus.PENDING }),
        makeFollowUp({ id: 'fu-future', followUpDate: new Date(FUTURE_DATE), status: FollowUpStatus.PENDING }),
      ]);
      prismaMock.followUp.count.mockResolvedValueOnce(2);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/follow-ups')
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(200);
      const past = res.body.data.find((item: { id: string }) => item.id === 'fu-past');
      const future = res.body.data.find((item: { id: string }) => item.id === 'fu-future');
      expect(past.isOverdue).toBe(true);
      expect(future.isOverdue).toBe(false);
    });
  });

  describe('GET /follow-ups/dashboard', () => {
    it('returns upcoming and overdue lists with the correct shape', async () => {
      prismaMock.followUp.findMany
        .mockResolvedValueOnce([makeFollowUp({ id: 'fu-upcoming', followUpDate: new Date(FUTURE_DATE) })])
        .mockResolvedValueOnce([
          makeFollowUp({ id: 'fu-overdue', followUpDate: new Date(PAST_DATE), status: FollowUpStatus.SENT }),
        ]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/follow-ups/dashboard')
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.upcoming).toHaveLength(1);
      expect(res.body.data.overdue).toHaveLength(1);
      expect(res.body.data.upcoming[0].isOverdue).toBe(false);
      expect(res.body.data.overdue[0].isOverdue).toBe(true);
    });
  });

  describe('Tenant isolation', () => {
    it('returns 404 when the follow-up belongs to a different clinic', async () => {
      prismaMock.followUp.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/follow-ups/${FOLLOWUP_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR, OTHER_CLINIC_ID)}`);

      expect(res.status).toBe(404);
      expect(prismaMock.followUp.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clinicId: OTHER_CLINIC_ID }),
        })
      );
    });
  });
});
