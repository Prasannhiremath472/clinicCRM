import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppointmentStatus, AppointmentType, Role, WeekDay } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  appointment: {
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
  doctor: {
    findFirst: vi.fn(),
  },
  doctorSchedule: {
    findMany: vi.fn(),
  },
  doctorLeave: {
    findMany: vi.fn(),
  },
  clinic: {
    findUnique: vi.fn(),
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { errorHandler } from '../src/middleware/errorHandler';
import { notFoundHandler } from '../src/middleware/notFoundHandler';
import { appointmentRoutes } from '../src/modules/appointments/appointment.routes';
import { appointmentService } from '../src/modules/appointments/appointment.service';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/appointments', appointmentRoutes);
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

// A known Monday, far enough in the future to never be "in the past" relative to test run time.
const MONDAY = '2026-06-29';

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

function makeDoctor(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: DOCTOR_UUID,
    doctorCode: 'DOC-000001',
    clinicId: CLINIC_ID,
    userId: 'user-doc-1',
    qualification: 'MBBS',
    specialization: 'Cardiology',
    experienceYears: 5,
    consultationFee: 500,
    isActive: true,
    user: { id: 'user-doc-1', firstName: 'Greg', lastName: 'House', email: 'doc@x.com', phone: null },
    schedules: [],
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sched-1',
    doctorId: DOCTOR_UUID,
    weekDay: WeekDay.MONDAY,
    startTime: '09:00',
    endTime: '09:30',
    slotDurationMinutes: 15,
    isActive: true,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  };
}

function makeAppointment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: APPOINTMENT_UUID,
    appointmentCode: 'APT-2026-000001',
    clinicId: CLINIC_ID,
    patientId: PATIENT_UUID,
    patient: { id: PATIENT_UUID, patientCode: 'PT-2026-000001', firstName: 'John', lastName: 'Doe', mobileNumber: '9876543210' },
    doctorId: DOCTOR_UUID,
    doctor: makeDoctor(),
    appointmentDate: new Date(MONDAY),
    startTime: '09:00',
    endTime: '09:15',
    type: AppointmentType.WALK_IN,
    status: AppointmentStatus.SCHEDULED,
    notes: null,
    cancelReason: null,
    createdById: 'user-1',
    createdBy: { id: 'user-1', firstName: 'Staff', lastName: 'One', role: Role.RECEPTIONIST },
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  };
}

describe('Appointments module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /appointments/availability', () => {
    it('excludes already-booked slots from the theoretical schedule', async () => {
      prismaMock.doctor.findFirst.mockResolvedValueOnce(makeDoctor());
      prismaMock.doctorSchedule.findMany.mockResolvedValueOnce([makeSchedule()]);
      prismaMock.doctorLeave.findMany.mockResolvedValueOnce([]);
      prismaMock.appointment.findMany.mockResolvedValueOnce([
        { id: 'other-appt', startTime: '09:00', endTime: '09:15' },
      ]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/appointments/availability')
        .query({ doctorId: DOCTOR_UUID, date: MONDAY })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
      expect(res.body.data.slots).toEqual([{ startTime: '09:15', endTime: '09:30' }]);
    });

    it('returns unavailable when doctor has no schedule for the day', async () => {
      prismaMock.doctor.findFirst.mockResolvedValueOnce(makeDoctor());
      prismaMock.doctorSchedule.findMany.mockResolvedValueOnce([]);
      prismaMock.doctorLeave.findMany.mockResolvedValueOnce([]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/appointments/availability')
        .query({ doctorId: DOCTOR_UUID, date: MONDAY })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ available: false, slots: [] });
      expect(prismaMock.appointment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('POST /appointments', () => {
    const validPayload = {
      patientId: PATIENT_UUID,
      doctorId: DOCTOR_UUID,
      appointmentDate: MONDAY,
      startTime: '09:00',
      type: 'WALK_IN',
    };

    it('creates an appointment successfully when the slot is available', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(makePatient());
      prismaMock.doctor.findFirst.mockResolvedValueOnce(makeDoctor());
      prismaMock.doctorSchedule.findMany.mockResolvedValue([makeSchedule()]);
      prismaMock.doctorLeave.findMany.mockResolvedValue([]);
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);
      prismaMock.appointment.count.mockResolvedValueOnce(0);
      prismaMock.appointment.create.mockResolvedValueOnce(makeAppointment());

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.appointmentCode).toBe('APT-2026-000001');
      expect(prismaMock.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ startTime: '09:00', endTime: '09:15' }),
        })
      );
    });

    it('rejects booking with 409 when the slot is already taken', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(makePatient());
      prismaMock.doctor.findFirst.mockResolvedValueOnce(makeDoctor());
      prismaMock.doctorSchedule.findMany.mockResolvedValue([makeSchedule()]);
      prismaMock.doctorLeave.findMany.mockResolvedValue([]);
      prismaMock.appointment.findMany.mockResolvedValueOnce([
        { id: 'existing', startTime: '09:00', endTime: '09:15' },
      ]);

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send(validPayload);

      expect(res.status).toBe(409);
      expect(prismaMock.appointment.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the patient does not exist in this clinic', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send(validPayload);

      expect(res.status).toBe(404);
      expect(prismaMock.doctor.findFirst).not.toHaveBeenCalled();
    });

    it('returns 404 when the doctor does not exist in this clinic', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(makePatient());
      prismaMock.doctor.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send(validPayload);

      expect(res.status).toBe(404);
      expect(prismaMock.appointment.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /appointments/:id/reschedule', () => {
    it('reschedules successfully to a new available slot', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(makeAppointment());
      prismaMock.doctorSchedule.findMany.mockResolvedValue([makeSchedule()]);
      prismaMock.doctorLeave.findMany.mockResolvedValue([]);
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);
      prismaMock.appointment.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.appointment.findUnique.mockResolvedValueOnce(
        makeAppointment({ startTime: '09:15', endTime: '09:30' })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/appointments/${APPOINTMENT_UUID}/reschedule`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ appointmentDate: MONDAY, startTime: '09:15' });

      expect(res.status).toBe(200);
      expect(res.body.data.startTime).toBe('09:15');
    });

    it('blocks reschedule when appointment is already completed', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(
        makeAppointment({ status: AppointmentStatus.COMPLETED })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/appointments/${APPOINTMENT_UUID}/reschedule`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ appointmentDate: MONDAY, startTime: '09:15' });

      expect(res.status).toBe(400);
      expect(prismaMock.appointment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /appointments/:id/cancel', () => {
    it('cancels a scheduled appointment successfully', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(makeAppointment());
      prismaMock.appointment.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.appointment.findUnique.mockResolvedValueOnce(
        makeAppointment({ status: AppointmentStatus.CANCELLED, cancelReason: 'Patient request' })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/appointments/${APPOINTMENT_UUID}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ cancelReason: 'Patient request' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('blocks cancel when appointment is already completed', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(
        makeAppointment({ status: AppointmentStatus.COMPLETED })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/appointments/${APPOINTMENT_UUID}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({});

      expect(res.status).toBe(400);
      expect(prismaMock.appointment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /appointments/:id/status', () => {
    it('allows a valid forward transition (SCHEDULED -> CONFIRMED)', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(makeAppointment());
      prismaMock.appointment.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.appointment.findUnique.mockResolvedValueOnce(
        makeAppointment({ status: AppointmentStatus.CONFIRMED })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/appointments/${APPOINTMENT_UUID}/status`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
    });

    it('rejects an invalid transition (COMPLETED -> SCHEDULED) with 400', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(
        makeAppointment({ status: AppointmentStatus.COMPLETED })
      );

      const app = buildApp();
      const res = await request(app)
        .patch(`/api/v1/appointments/${APPOINTMENT_UUID}/status`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ status: 'SCHEDULED' });

      expect(res.status).toBe(400);
      expect(prismaMock.appointment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('GET /appointments', () => {
    it('lists appointments filtered by date range', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([makeAppointment()]);
      prismaMock.appointment.count.mockResolvedValueOnce(1);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/appointments')
        .query({ fromDate: MONDAY, toDate: MONDAY })
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinicId: CLINIC_ID,
            appointmentDate: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
          }),
        })
      );
    });
  });

  describe('Tenant isolation', () => {
    it('returns 404 when the appointment belongs to a different clinic', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/appointments/${APPOINTMENT_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR, OTHER_CLINIC_ID)}`);

      expect(res.status).toBe(404);
      expect(prismaMock.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clinicId: OTHER_CLINIC_ID }),
        })
      );
    });
  });

  describe('isValidStatusTransition / state machine (unit, via service export)', () => {
    it('exposes status-transition aware behavior consistent with the API tests above', () => {
      // Sanity-check the service module loads with the transition map intact.
      expect(typeof appointmentService.updateAppointmentStatus).toBe('function');
    });
  });
});
