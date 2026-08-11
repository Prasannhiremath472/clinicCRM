import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { BloodGroup, Gender, Role } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  patient: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  patientDocument: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { errorHandler } from '../src/middleware/errorHandler';
import { notFoundHandler } from '../src/middleware/notFoundHandler';
import { patientRoutes } from '../src/modules/patients/patient.routes';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/patients', patientRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const NOW = Date.now();
const CLINIC_ID = 'clinic-1';
const OTHER_CLINIC_ID = 'clinic-2';

function tokenFor(role: Role, clinicId: string | null = CLINIC_ID): string {
  return jwt.sign(
    { sub: 'user-1', role, clinicId, email: 'staff@example.com' },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: '15m' }
  );
}

function makePatient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'patient-1',
    patientCode: 'PT-2026-000001',
    clinicId: CLINIC_ID,
    firstName: 'John',
    lastName: 'Doe',
    gender: Gender.MALE,
    dateOfBirth: new Date('1990-01-01'),
    mobileNumber: '9876543210',
    alternateMobile: null,
    email: null,
    bloodGroup: BloodGroup.UNKNOWN,
    maritalStatus: null,
    country: null,
    state: null,
    city: null,
    pincode: null,
    address: null,
    allergies: null,
    existingDiseases: null,
    currentMedications: null,
    medicalHistory: null,
    emergencyContactName: null,
    emergencyContactRelation: null,
    emergencyContactMobile: null,
    isActive: true,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    deletedAt: null,
    ...overrides,
  };
}

const validCreatePayload = {
  firstName: 'John',
  lastName: 'Doe',
  gender: 'MALE',
  dateOfBirth: '1990-01-01',
  mobileNumber: '9876543210',
};

describe('Patients module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /patients', () => {
    it('creates a patient successfully with a valid patientCode format', async () => {
      prismaMock.patient.count.mockResolvedValueOnce(0);
      prismaMock.patient.create.mockResolvedValueOnce(
        makePatient({ patientCode: `PT-${new Date().getFullYear()}-000001` })
      );

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send(validCreatePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patientCode).toMatch(/^PT-\d{4}-\d{6}$/);
      expect(prismaMock.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clinicId: CLINIC_ID, firstName: 'John' }),
        })
      );
    });

    it('rejects invalid data with 400', async () => {
      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ firstName: '', lastName: 'Doe', gender: 'MALE', dateOfBirth: '1990-01-01', mobileNumber: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(prismaMock.patient.create).not.toHaveBeenCalled();
    });

    it('rejects partial emergency contact info with 400', async () => {
      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ ...validCreatePayload, emergencyContactName: 'Jane Doe' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(prismaMock.patient.create).not.toHaveBeenCalled();
    });

    it('accepts complete emergency contact info', async () => {
      prismaMock.patient.count.mockResolvedValueOnce(0);
      prismaMock.patient.create.mockResolvedValueOnce(makePatient());

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({
          ...validCreatePayload,
          emergencyContactName: 'Jane Doe',
          emergencyContactRelation: 'Spouse',
          emergencyContactMobile: '9123456789',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /patients', () => {
    it('lists patients with pagination and search applied', async () => {
      prismaMock.patient.findMany.mockResolvedValueOnce([makePatient()]);
      prismaMock.patient.count.mockResolvedValueOnce(1);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/patients')
        .query({ page: 1, pageSize: 10, search: 'John' })
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].age).toBeTypeOf('number');
      expect(res.body.meta).toEqual(
        expect.objectContaining({ page: 1, pageSize: 10, totalItems: 1 })
      );
      expect(prismaMock.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinicId: CLINIC_ID,
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('GET /patients/:id', () => {
    it('returns 404 when the patient belongs to a different clinic (tenant isolation)', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/patients/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR, OTHER_CLINIC_ID)}`);

      expect(res.status).toBe(404);
      expect(prismaMock.patient.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clinicId: OTHER_CLINIC_ID }),
        })
      );
    });

    it('returns the patient with computed age when found', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce({ ...makePatient(), documents: [] });

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/patients/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.age).toBeTypeOf('number');
      expect(res.body.data.documents).toEqual([]);
    });
  });

  describe('PATCH /patients/:id', () => {
    it('updates a patient successfully', async () => {
      prismaMock.patient.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.patient.findUnique.mockResolvedValueOnce(makePatient({ firstName: 'Jonathan' }));

      const app = buildApp();
      const res = await request(app)
        .patch('/api/v1/patients/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ firstName: 'Jonathan' });

      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Jonathan');
      expect(prismaMock.patient.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: '123e4567-e89b-12d3-a456-426614174000', clinicId: CLINIC_ID }),
        })
      );
    });
  });

  describe('DELETE /patients/:id', () => {
    it('allows CLINIC_ADMIN to soft delete a patient', async () => {
      prismaMock.patient.updateMany.mockResolvedValueOnce({ count: 1 });

      const app = buildApp();
      const res = await request(app)
        .delete('/api/v1/patients/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(prismaMock.patient.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });

    it('rejects RECEPTIONIST from soft deleting a patient with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .delete('/api/v1/patients/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(403);
      expect(prismaMock.patient.updateMany).not.toHaveBeenCalled();
    });
  });
});
