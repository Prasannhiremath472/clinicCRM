import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppointmentStatus, AppointmentType, FollowUpStatus, PaymentMethod, PaymentStatus, Role } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  appointment: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  payment: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
  },
  patient: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
  },
  doctor: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  consultation: {
    count: vi.fn(),
  },
  followUp: {
    findMany: vi.fn(),
  },
  clinic: {
    findUnique: vi.fn(),
  },
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

      addPage() {
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

vi.mock('exceljs', () => {
  class FakeRow {
    font: unknown;
    cells: unknown[];
    constructor(cells: unknown[]) {
      this.cells = cells;
    }
  }

  class FakeWorksheet {
    columns: unknown;
    rows: FakeRow[] = [];

    addRow(cells: unknown[]) {
      const row = new FakeRow(cells);
      this.rows.push(row);
      return row;
    }

    getRow(rowNumber: number) {
      return this.rows[rowNumber - 1] ?? new FakeRow([]);
    }
  }

  class FakeWorkbook {
    worksheets: FakeWorksheet[] = [];
    xlsx = {
      writeBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-excel')),
    };

    addWorksheet(_name: string) {
      const worksheet = new FakeWorksheet();
      this.worksheets.push(worksheet);
      return worksheet;
    }
  }

  return {
    default: { Workbook: FakeWorkbook },
    Workbook: FakeWorkbook,
  };
});

import { errorHandler } from '../src/middleware/errorHandler';
import { notFoundHandler } from '../src/middleware/notFoundHandler';
import { reportRoutes } from '../src/modules/reports/report.routes';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/reports', reportRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const CLINIC_ID = 'clinic-1';
const OTHER_CLINIC_ID = 'clinic-2';
const PATIENT_UUID = '123e4567-e89b-12d3-a456-426614174001';
const DOCTOR_UUID = '123e4567-e89b-12d3-a456-426614174002';
const STAFF_USER_UUID = 'user-staff-1';

function tokenFor(role: Role, clinicId: string | null = CLINIC_ID, sub = STAFF_USER_UUID): string {
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
    firstName: 'John',
    lastName: 'Doe',
    mobileNumber: '9876543210',
    gender: 'MALE',
    dateOfBirth: new Date('1990-01-01'),
    isActive: true,
    createdAt: new Date('2026-01-15'),
    ...overrides,
  };
}

function makeAppointment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'appt-1',
    appointmentCode: 'APT-2026-000001',
    appointmentDate: new Date('2026-01-10'),
    startTime: '10:00',
    endTime: '10:15',
    type: AppointmentType.WALK_IN,
    status: AppointmentStatus.COMPLETED,
    patient: makePatient(),
    doctor: { user: { firstName: 'Greg', lastName: 'House' } },
    ...overrides,
  };
}

function makePayment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'payment-1',
    receiptNumber: 'RCT-2026-000001',
    amount: 500,
    method: PaymentMethod.CASH,
    paidAt: new Date('2026-01-10T10:00:00Z'),
    invoice: { invoiceNumber: 'INV-2026-000001', patient: makePatient() },
    collectedBy: { firstName: 'Staff', lastName: 'User' },
    ...overrides,
  };
}

function makeDoctor(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: DOCTOR_UUID,
    clinicId: CLINIC_ID,
    specialization: 'Cardiology',
    isActive: true,
    user: { firstName: 'Greg', lastName: 'House' },
    ...overrides,
  };
}

function makeFollowUp(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'followup-1',
    followUpDate: new Date('2020-01-01'),
    reason: 'Routine check-up',
    status: FollowUpStatus.PENDING,
    patient: makePatient(),
    ...overrides,
  };
}

const VALID_RANGE = { fromDate: '2026-01-01', toDate: '2026-01-31' };

describe('Reports module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /reports/appointments', () => {
    it('returns the correct shape with mocked data', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([makeAppointment()]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/appointments')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.rows).toEqual([
        {
          appointmentCode: 'APT-2026-000001',
          patientName: 'John Doe',
          doctorName: 'Greg House',
          date: makeAppointment().appointmentDate.toISOString(),
          time: '10:00',
          type: 'WALK_IN',
          status: 'COMPLETED',
        },
      ]);
    });

    it('verifies the clinicId scoping in the prisma where-clause (tenant isolation)', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);

      const app = buildApp();
      await request(app)
        .get('/api/v1/reports/appointments')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST, OTHER_CLINIC_ID)}`);

      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clinicId: OTHER_CLINIC_ID }),
        })
      );
    });

    it('allows DOCTOR role with 200', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/appointments')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /reports/revenue', () => {
    it('returns the correct shape and summary with mocked data', async () => {
      prismaMock.payment.findMany.mockResolvedValueOnce([makePayment()]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/revenue')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.rows).toHaveLength(1);
      expect(res.body.data.rows[0]).toMatchObject({
        receiptNumber: 'RCT-2026-000001',
        invoiceNumber: 'INV-2026-000001',
        patientName: 'John Doe',
        amount: 500,
        method: 'CASH',
      });
      expect(res.body.data.summary).toEqual({ totalRevenue: 500, paymentCount: 1 });
    });

    it('blocks DOCTOR role with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/revenue')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(403);
      expect(prismaMock.payment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('GET /reports/patients', () => {
    it('returns the correct shape and summary with mocked data', async () => {
      prismaMock.patient.findMany.mockResolvedValueOnce([makePatient()]);
      prismaMock.patient.count.mockResolvedValueOnce(42);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/patients')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.rows).toHaveLength(1);
      expect(res.body.data.rows[0]).toMatchObject({
        patientCode: 'PT-2026-000001',
        name: 'John Doe',
        gender: 'MALE',
        mobileNumber: '9876543210',
      });
      expect(res.body.data.summary).toEqual({ totalPatients: 42, newInRange: 1 });
    });

    it('allows DOCTOR role with 200', async () => {
      prismaMock.patient.findMany.mockResolvedValueOnce([]);
      prismaMock.patient.count.mockResolvedValueOnce(0);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/patients')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /reports/doctor-performance', () => {
    it('returns the correct shape with mocked data', async () => {
      prismaMock.doctor.findMany.mockResolvedValueOnce([makeDoctor()]);
      prismaMock.appointment.count.mockResolvedValueOnce(5);
      prismaMock.consultation.count.mockResolvedValueOnce(4);
      prismaMock.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: 2500 } });

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/doctor-performance')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.rows).toEqual([
        {
          doctorName: 'Greg House',
          specialization: 'Cardiology',
          appointmentsCompleted: 5,
          consultationsConducted: 4,
          revenueGenerated: 2500,
        },
      ]);
    });

    it('blocks DOCTOR role with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/doctor-performance')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(403);
      expect(prismaMock.doctor.findMany).not.toHaveBeenCalled();
    });
  });

  describe('GET /reports/follow-ups', () => {
    it('returns the correct shape with mocked data and computes isOverdue correctly', async () => {
      prismaMock.followUp.findMany.mockResolvedValueOnce([makeFollowUp()]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/follow-ups')
        .query({ fromDate: '2019-01-01', toDate: '2026-12-31' })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.rows).toHaveLength(1);
      expect(res.body.data.rows[0]).toMatchObject({
        patientName: 'John Doe',
        reason: 'Routine check-up',
        status: 'PENDING',
        isOverdue: true,
      });
    });

    it('allows DOCTOR role with 200', async () => {
      prismaMock.followUp.findMany.mockResolvedValueOnce([]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/follow-ups')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Validation', () => {
    it('rejects an invalid status value for a report type with 400', async () => {
      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/appointments')
        .query({ ...VALID_RANGE, status: 'NOT_A_REAL_STATUS' })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(400);
      expect(prismaMock.appointment.findMany).not.toHaveBeenCalled();
    });

    it('rejects a missing fromDate with 400', async () => {
      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/appointments')
        .query({ toDate: '2026-01-31' })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(400);
    });

    it('rejects a missing toDate with 400', async () => {
      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/appointments')
        .query({ fromDate: '2026-01-01' })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(400);
    });

    it('rejects a toDate before fromDate with 400', async () => {
      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/appointments')
        .query({ fromDate: '2026-01-31', toDate: '2026-01-01' })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Exports', () => {
    it('returns a PDF buffer with the correct content type for format=pdf', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([makeAppointment()]);
      prismaMock.clinic.findUnique.mockResolvedValueOnce({
        id: CLINIC_ID,
        name: 'Test Clinic',
        address: '123 Main St',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
        phone: '080-1234567',
        email: 'clinic@example.com',
      });

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/appointments')
        .query({ ...VALID_RANGE, format: 'pdf' })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('returns an Excel buffer with the correct content type for format=excel', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([makeAppointment()]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/reports/appointments')
        .query({ ...VALID_RANGE, format: 'excel' })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });
  });

  describe('Tenant isolation', () => {
    it('scopes the revenue report query by the requesting user clinicId', async () => {
      prismaMock.payment.findMany.mockResolvedValueOnce([]);

      const app = buildApp();
      await request(app)
        .get('/api/v1/reports/revenue')
        .query(VALID_RANGE)
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN, OTHER_CLINIC_ID)}`);

      expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({ clinicId: OTHER_CLINIC_ID }),
          }),
        })
      );
    });
  });
});
