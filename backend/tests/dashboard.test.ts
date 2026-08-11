import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { FollowUpStatus, Role } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  appointment: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  patient: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  payment: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  invoice: {
    aggregate: vi.fn(),
  },
  $queryRaw: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

const followUpServiceMock = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
}));

vi.mock('../src/modules/followups/followup.service', () => ({
  followUpService: followUpServiceMock,
}));

import { errorHandler } from '../src/middleware/errorHandler';
import { notFoundHandler } from '../src/middleware/notFoundHandler';
import { dashboardRoutes } from '../src/modules/dashboard/dashboard.routes';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const CLINIC_ID = 'clinic-1';

function tokenFor(role: Role, clinicId: string | null = CLINIC_ID, sub = 'user-1'): string {
  return jwt.sign(
    { sub, role, clinicId, email: 'staff@example.com' },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: '15m' }
  );
}

function makeFollowUp(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'fu-1',
    clinicId: CLINIC_ID,
    patientId: 'patient-1',
    patient: { id: 'patient-1', patientCode: 'PT-2026-000001', firstName: 'John', lastName: 'Doe', mobileNumber: '9876543210' },
    appointmentId: null,
    appointment: null,
    followUpDate: new Date('2026-06-30'),
    reason: 'Review',
    status: FollowUpStatus.PENDING,
    reminderSentAt: null,
    createdById: 'user-1',
    createdBy: { id: 'user-1', firstName: 'Staff', lastName: 'One', role: Role.RECEPTIONIST },
    createdAt: new Date(),
    updatedAt: new Date(),
    isOverdue: false,
    ...overrides,
  };
}

describe('Dashboard module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /dashboard/summary', () => {
    it('returns the assembled summary with correct followUpsDue and clinic-scoped queries', async () => {
      prismaMock.appointment.count.mockResolvedValueOnce(4);
      prismaMock.patient.count.mockResolvedValueOnce(120).mockResolvedValueOnce(7);
      prismaMock.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: 2500 } });
      prismaMock.invoice.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 9000, paidAmount: 3000 } });
      followUpServiceMock.getDashboardSummary.mockResolvedValueOnce({
        upcoming: [makeFollowUp({ id: 'fu-up-1' }), makeFollowUp({ id: 'fu-up-2' })],
        overdue: [makeFollowUp({ id: 'fu-over-1', isOverdue: true })],
      });

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        todayAppointments: 4,
        totalPatients: 120,
        newPatientsThisMonth: 7,
        todayRevenue: 2500,
        pendingPayments: 6000,
        followUpsDue: 3,
      });
      expect(res.body.data.upcomingFollowUps).toHaveLength(2);
      expect(res.body.data.overdueFollowUps).toHaveLength(1);

      expect(prismaMock.appointment.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinicId: CLINIC_ID }) })
      );
      expect(prismaMock.patient.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinicId: CLINIC_ID }) })
      );
      expect(prismaMock.payment.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ invoice: { clinicId: CLINIC_ID } }),
        })
      );
      expect(prismaMock.invoice.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinicId: CLINIC_ID }) })
      );
      expect(followUpServiceMock.getDashboardSummary).toHaveBeenCalledWith(CLINIC_ID);
    });

    it('defaults revenue/pending figures to zero when aggregates return null sums', async () => {
      prismaMock.appointment.count.mockResolvedValueOnce(0);
      prismaMock.patient.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prismaMock.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: null } });
      prismaMock.invoice.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: null, paidAmount: null } });
      followUpServiceMock.getDashboardSummary.mockResolvedValueOnce({ upcoming: [], overdue: [] });

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.todayRevenue).toBe(0);
      expect(res.body.data.pendingPayments).toBe(0);
      expect(res.body.data.followUpsDue).toBe(0);
    });
  });

  describe('GET /dashboard/trends', () => {
    it('zero-fills all 30 days even when the DB only returns data for 2 of them', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dayWithData1 = new Date(today);
      dayWithData1.setDate(dayWithData1.getDate() - 5);
      const dayWithData2 = new Date(today);
      dayWithData2.setDate(dayWithData2.getDate() - 1);

      // appointmentTrend
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { day: dayWithData1, count: 3n },
        { day: dayWithData2, count: 7n },
      ]);
      // revenueTrend
      prismaMock.$queryRaw.mockResolvedValueOnce([{ day: dayWithData2, total: 1500 }]);
      // patientGrowthTrend (raw rows)
      prismaMock.$queryRaw.mockResolvedValueOnce([{ day: dayWithData1, count: 2n }]);
      // patientGrowthTrend baseline count
      prismaMock.patient.count.mockResolvedValueOnce(50);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/dashboard/trends')
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointmentTrend).toHaveLength(30);
      expect(res.body.data.revenueTrend).toHaveLength(30);
      expect(res.body.data.patientGrowthTrend).toHaveLength(30);

      const zeroCountDays = res.body.data.appointmentTrend.filter(
        (point: { count: number }) => point.count === 0
      );
      expect(zeroCountDays).toHaveLength(28);

      const nonZeroDays = res.body.data.appointmentTrend.filter(
        (point: { count: number }) => point.count > 0
      );
      expect(nonZeroDays).toHaveLength(2);

      // cumulative on the patient growth trend should be monotonically non-decreasing
      // and start from the baseline (50) plus that day's count if applicable.
      const growth = res.body.data.patientGrowthTrend;
      for (let i = 1; i < growth.length; i += 1) {
        expect(growth[i].cumulative).toBeGreaterThanOrEqual(growth[i - 1].cumulative);
      }
      expect(growth[growth.length - 1].cumulative).toBe(50 + 2);
    });
  });

  describe('GET /dashboard/recent-activity', () => {
    it('merges and sorts patient/appointment/payment activity by timestamp descending', async () => {
      const oldest = new Date('2026-06-01T08:00:00Z');
      const middle = new Date('2026-06-10T08:00:00Z');
      const newest = new Date('2026-06-20T08:00:00Z');

      prismaMock.patient.findMany.mockResolvedValueOnce([
        { id: 'p1', firstName: 'Alice', lastName: 'Smith', createdAt: oldest },
      ]);
      prismaMock.appointment.findMany.mockResolvedValueOnce([
        {
          id: 'a1',
          createdAt: newest,
          patient: { firstName: 'Bob', lastName: 'Jones' },
          doctor: { user: { firstName: 'Carol', lastName: 'White' } },
        },
      ]);
      prismaMock.payment.findMany.mockResolvedValueOnce([
        {
          id: 'pay1',
          amount: 500,
          paidAt: middle,
          method: 'CASH',
          invoice: { patient: { firstName: 'Dave', lastName: 'Lee' } },
        },
      ]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/dashboard/recent-activity')
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].type).toBe('APPOINTMENT');
      expect(res.body.data[1].type).toBe('PAYMENT');
      expect(res.body.data[2].type).toBe('PATIENT');
      expect(new Date(res.body.data[0].timestamp).getTime()).toBeGreaterThan(
        new Date(res.body.data[1].timestamp).getTime()
      );
      expect(new Date(res.body.data[1].timestamp).getTime()).toBeGreaterThan(
        new Date(res.body.data[2].timestamp).getTime()
      );

      expect(prismaMock.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinicId: CLINIC_ID }) })
      );
      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinicId: CLINIC_ID }) })
      );
      expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ invoice: { clinicId: CLINIC_ID } }),
        })
      );
    });
  });

  describe('Authentication', () => {
    it('returns 401 without an auth token', async () => {
      const app = buildApp();
      const res = await request(app).get('/api/v1/dashboard/summary');

      expect(res.status).toBe(401);
    });
  });
});
