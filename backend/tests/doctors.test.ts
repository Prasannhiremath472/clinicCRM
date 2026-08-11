import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Role, WeekDay } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  doctor: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  doctorSchedule: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  doctorLeave: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async (password: string) => `hashed:${password}`),
    compare: vi.fn(async () => true),
  },
}));

import { errorHandler } from '../src/middleware/errorHandler';
import { notFoundHandler } from '../src/middleware/notFoundHandler';
import { doctorRoutes } from '../src/modules/doctors/doctor.routes';
import { doctorService } from '../src/modules/doctors/doctor.service';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/doctors', doctorRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const NOW = Date.now();
const CLINIC_ID = 'clinic-1';
const OTHER_CLINIC_ID = 'clinic-2';
const DOCTOR_UUID = '123e4567-e89b-12d3-a456-426614174000';

function tokenFor(role: Role, clinicId: string | null = CLINIC_ID, sub = 'user-1'): string {
  return jwt.sign(
    { sub, role, clinicId, email: 'staff@example.com' },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: '15m' }
  );
}

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-doc-1',
    clinicId: CLINIC_ID,
    email: 'doc@example.com',
    passwordHash: 'hashed:Password1',
    firstName: 'Greg',
    lastName: 'House',
    phone: null,
    role: Role.DOCTOR,
    isActive: true,
    lastLoginAt: null,
    passwordChangedAt: null,
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
    userId: 'user-doc-1',
    qualification: 'MBBS, MD',
    specialization: 'Cardiology',
    experienceYears: 10,
    consultationFee: 500,
    signatureUrl: null,
    isActive: true,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    user: makeUser(),
    ...overrides,
  };
}

const validCreatePayload = {
  firstName: 'Greg',
  lastName: 'House',
  email: 'doc@example.com',
  password: 'Password1',
  qualification: 'MBBS, MD',
  specialization: 'Cardiology',
  experienceYears: 10,
  consultationFee: 500,
};

describe('Doctors module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /doctors', () => {
    it('creates a doctor successfully with a valid doctorCode format and hashed password', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      prismaMock.doctor.count.mockResolvedValueOnce(0);
      prismaMock.$transaction.mockImplementationOnce(async (cb: any) =>
        cb({
          user: { create: vi.fn().mockResolvedValueOnce(makeUser()) },
          doctor: { create: vi.fn().mockResolvedValueOnce(makeDoctor()) },
        })
      );

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/doctors')
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`)
        .send(validCreatePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.doctorCode).toMatch(/^DOC-\d{6}$/);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects duplicate email with 409', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(makeUser());

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/doctors')
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`)
        .send(validCreatePayload);

      expect(res.status).toBe(409);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects RECEPTIONIST from creating a doctor with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/doctors')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send(validCreatePayload);

      expect(res.status).toBe(403);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects invalid data with 400', async () => {
      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/doctors')
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`)
        .send({ ...validCreatePayload, password: 'weak' });

      expect(res.status).toBe(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('GET /doctors', () => {
    it('lists doctors with pagination and filters applied', async () => {
      prismaMock.doctor.findMany.mockResolvedValueOnce([makeDoctor()]);
      prismaMock.doctor.count.mockResolvedValueOnce(1);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/doctors')
        .query({ page: 1, pageSize: 10, search: 'Cardio' })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toEqual(
        expect.objectContaining({ page: 1, pageSize: 10, totalItems: 1 })
      );
      expect(prismaMock.doctor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clinicId: CLINIC_ID, OR: expect.any(Array) }),
        })
      );
    });
  });

  describe('GET /doctors/:id', () => {
    it('returns 404 when the doctor belongs to a different clinic (tenant isolation)', async () => {
      prismaMock.doctor.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/doctors/${DOCTOR_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR, OTHER_CLINIC_ID)}`);

      expect(res.status).toBe(404);
      expect(prismaMock.doctor.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clinicId: OTHER_CLINIC_ID }),
        })
      );
    });

    it('returns the doctor with schedules when found', async () => {
      prismaMock.doctor.findFirst.mockResolvedValueOnce({ ...makeDoctor(), schedules: [] });

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/doctors/${DOCTOR_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.doctorCode).toBe('DOC-000001');
      expect(res.body.data.schedules).toEqual([]);
    });
  });

  describe('PATCH /doctors/:id', () => {
    it('allows CLINIC_ADMIN to update doctor profile fields', async () => {
      prismaMock.doctor.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.doctor.findUnique.mockResolvedValueOnce(makeDoctor({ specialization: 'Neurology' }));

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/doctors/${DOCTOR_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`)
        .send({ specialization: 'Neurology' });

      expect(res.status).toBe(200);
      expect(res.body.data.specialization).toBe('Neurology');
    });

    it('rejects RECEPTIONIST from updating a doctor with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/doctors/${DOCTOR_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ specialization: 'Neurology' });

      expect(res.status).toBe(403);
      expect(prismaMock.doctor.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /doctors/:id', () => {
    it('allows CLINIC_ADMIN to deactivate a doctor (doctor + linked user)', async () => {
      prismaMock.doctor.findFirst.mockResolvedValueOnce(makeDoctor());
      prismaMock.$transaction.mockResolvedValueOnce([{}, {}]);

      const app = buildApp();
      const res = await request(app)
        .delete(`/api/v1/doctors/${DOCTOR_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('rejects RECEPTIONIST from deactivating a doctor with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .delete(`/api/v1/doctors/${DOCTOR_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(403);
      expect(prismaMock.doctor.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('PUT /doctors/:id/schedule', () => {
    const validSchedule = {
      schedules: [
        { weekDay: 'MONDAY', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15, isActive: true },
      ],
    };

    it('accepts a valid weekly schedule and replaces existing rows', async () => {
      prismaMock.doctor.findFirst.mockResolvedValueOnce({ ...makeDoctor(), schedules: [] });
      prismaMock.$transaction.mockImplementationOnce(async (cb: any) =>
        cb({
          doctorSchedule: {
            deleteMany: vi.fn().mockResolvedValueOnce({ count: 0 }),
            createMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
            findMany: vi.fn().mockResolvedValueOnce([
              {
                id: 'sched-1',
                doctorId: DOCTOR_UUID,
                weekDay: WeekDay.MONDAY,
                startTime: '09:00',
                endTime: '17:00',
                slotDurationMinutes: 15,
                isActive: true,
                createdAt: new Date(NOW),
                updatedAt: new Date(NOW),
              },
            ]),
          },
        })
      );

      const app = buildApp();
      const res = await request(app)
        .put(`/api/v1/doctors/${DOCTOR_UUID}/schedule`)
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`)
        .send(validSchedule);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('rejects a schedule where endTime is before startTime with 400', async () => {
      const app = buildApp();
      const res = await request(app)
        .put(`/api/v1/doctors/${DOCTOR_UUID}/schedule`)
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`)
        .send({
          schedules: [
            { weekDay: 'MONDAY', startTime: '17:00', endTime: '09:00', slotDurationMinutes: 15 },
          ],
        });

      expect(res.status).toBe(400);
      expect(prismaMock.doctor.findFirst).not.toHaveBeenCalled();
    });

    it('rejects RECEPTIONIST from setting a schedule with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .put(`/api/v1/doctors/${DOCTOR_UUID}/schedule`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send(validSchedule);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /doctors/:id/availability', () => {
    it('computes available slots from the active weekly schedule', async () => {
      // Pick a known Monday.
      const monday = new Date('2026-06-22T00:00:00.000Z');
      const schedules = [
        {
          id: 'sched-1',
          doctorId: DOCTOR_UUID,
          weekDay: WeekDay.MONDAY,
          startTime: '09:00',
          endTime: '09:30',
          slotDurationMinutes: 15,
          isActive: true,
          createdAt: new Date(NOW),
          updatedAt: new Date(NOW),
        },
      ];

      prismaMock.doctor.findFirst.mockResolvedValueOnce({ ...makeDoctor(), schedules: [] });
      prismaMock.doctorSchedule.findMany.mockResolvedValueOnce(schedules);
      prismaMock.doctorLeave.findMany.mockResolvedValueOnce([]);

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/doctors/${DOCTOR_UUID}/availability`)
        .query({ date: monday.toISOString().slice(0, 10) })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
      expect(res.body.data.slots).toEqual([
        { startTime: '09:00', endTime: '09:15' },
        { startTime: '09:15', endTime: '09:30' },
      ]);
    });

    it('returns unavailable when the doctor is on leave that day', async () => {
      const monday = new Date('2026-06-22T00:00:00.000Z');
      const schedules = [
        {
          id: 'sched-1',
          doctorId: DOCTOR_UUID,
          weekDay: WeekDay.MONDAY,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: 15,
          isActive: true,
          createdAt: new Date(NOW),
          updatedAt: new Date(NOW),
        },
      ];

      prismaMock.doctor.findFirst.mockResolvedValueOnce({ ...makeDoctor(), schedules: [] });
      prismaMock.doctorSchedule.findMany.mockResolvedValueOnce(schedules);
      prismaMock.doctorLeave.findMany.mockResolvedValueOnce([
        { id: 'leave-1', doctorId: DOCTOR_UUID, date: monday, reason: 'Conference', createdAt: new Date(NOW) },
      ]);

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/doctors/${DOCTOR_UUID}/availability`)
        .query({ date: monday.toISOString().slice(0, 10) })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ available: false, slots: [] });
    });
  });

  describe('computeAvailableSlots (unit)', () => {
    it('returns unavailable when there is no schedule for that weekday', () => {
      const result = doctorService.computeAvailableSlots([], [], new Date('2026-06-22T00:00:00.000Z'));
      expect(result).toEqual({ available: false, slots: [] });
    });
  });
});
