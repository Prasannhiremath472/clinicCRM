import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type RecentActivityType = 'PATIENT' | 'APPOINTMENT' | 'PAYMENT';

export interface RecentActivityItem {
  type: RecentActivityType;
  id: string;
  description: string;
  timestamp: Date;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function endOfToday(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Builds an ordered list of calendar day keys ("YYYY-MM-DD") spanning fromDate to
 * toDate inclusive, used to zero-fill sparse trend query results.
 */
function buildDayRange(fromDate: Date, toDate: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(fromDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    days.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function countTodayAppointments(clinicId: string): Promise<number> {
  return prisma.appointment.count({
    where: {
      clinicId,
      appointmentDate: { gte: startOfToday(), lte: endOfToday() },
    },
  });
}

function countTotalPatients(clinicId: string): Promise<number> {
  return prisma.patient.count({
    where: { clinicId, isActive: true, deletedAt: null },
  });
}

function countNewPatientsThisMonth(clinicId: string): Promise<number> {
  return prisma.patient.count({
    where: { clinicId, deletedAt: null, createdAt: { gte: startOfCurrentMonth() } },
  });
}

async function getTodayRevenue(clinicId: string): Promise<number> {
  const result = await prisma.payment.aggregate({
    where: {
      invoice: { clinicId },
      paidAt: { gte: startOfToday(), lte: endOfToday() },
    },
    _sum: { amount: true },
  });

  return result._sum.amount ? Number(result._sum.amount) : 0;
}

async function getPendingPaymentsTotal(clinicId: string): Promise<number> {
  const result = await prisma.invoice.aggregate({
    where: {
      clinicId,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
    },
    _sum: { totalAmount: true, paidAmount: true },
  });

  const totalAmount = result._sum.totalAmount ? Number(result._sum.totalAmount) : 0;
  const paidAmount = result._sum.paidAmount ? Number(result._sum.paidAmount) : 0;

  return totalAmount - paidAmount;
}

async function getAppointmentTrend(
  clinicId: string,
  fromDate: Date,
  toDate: Date
): Promise<{ date: string; count: number }[]> {
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>(
    Prisma.sql`SELECT DATE(appointmentDate) as day, COUNT(*) as count
      FROM appointments
      WHERE clinicId = ${clinicId}
        AND appointmentDate >= ${fromDate}
        AND appointmentDate <= ${toDate}
      GROUP BY DATE(appointmentDate)`
  );

  const byDay = new Map<string, number>();
  for (const row of rows) {
    byDay.set(toDateKey(new Date(row.day)), Number(row.count));
  }

  return buildDayRange(fromDate, toDate).map((date) => ({
    date,
    count: byDay.get(date) ?? 0,
  }));
}

async function getRevenueTrend(
  clinicId: string,
  fromDate: Date,
  toDate: Date
): Promise<{ date: string; amount: number }[]> {
  const rows = await prisma.$queryRaw<{ day: Date; total: Prisma.Decimal | number | null }[]>(
    Prisma.sql`SELECT DATE(p.paidAt) as day, SUM(p.amount) as total
      FROM payments p
      INNER JOIN invoices i ON p.invoiceId = i.id
      WHERE i.clinicId = ${clinicId}
        AND p.paidAt >= ${fromDate}
        AND p.paidAt <= ${toDate}
      GROUP BY DATE(p.paidAt)`
  );

  const byDay = new Map<string, number>();
  for (const row of rows) {
    byDay.set(toDateKey(new Date(row.day)), row.total ? Number(row.total) : 0);
  }

  return buildDayRange(fromDate, toDate).map((date) => ({
    date,
    amount: byDay.get(date) ?? 0,
  }));
}

async function getPatientGrowthTrend(
  clinicId: string,
  fromDate: Date,
  toDate: Date
): Promise<{ date: string; count: number; cumulative: number }[]> {
  const [rows, baselineCount] = await Promise.all([
    prisma.$queryRaw<{ day: Date; count: bigint }[]>(
      Prisma.sql`SELECT DATE(createdAt) as day, COUNT(*) as count
        FROM patients
        WHERE clinicId = ${clinicId}
          AND deletedAt IS NULL
          AND createdAt >= ${fromDate}
          AND createdAt <= ${toDate}
        GROUP BY DATE(createdAt)`
    ),
    prisma.patient.count({
      where: { clinicId, deletedAt: null, createdAt: { lt: fromDate } },
    }),
  ]);

  const byDay = new Map<string, number>();
  for (const row of rows) {
    byDay.set(toDateKey(new Date(row.day)), Number(row.count));
  }

  let cumulative = baselineCount;

  return buildDayRange(fromDate, toDate).map((date) => {
    const count = byDay.get(date) ?? 0;
    cumulative += count;
    return { date, count, cumulative };
  });
}

async function getRecentActivity(clinicId: string, limit: number): Promise<RecentActivityItem[]> {
  const [patients, appointments, payments] = await Promise.all([
    prisma.patient.findMany({
      where: { clinicId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    }),
    prisma.appointment.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.payment.findMany({
      where: { invoice: { clinicId } },
      orderBy: { paidAt: 'desc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        paidAt: true,
        method: true,
        invoice: { select: { patient: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  const patientItems: RecentActivityItem[] = patients.map((patient) => ({
    type: 'PATIENT',
    id: patient.id,
    description: `New patient registered: ${patient.firstName} ${patient.lastName}`,
    timestamp: patient.createdAt,
  }));

  const appointmentItems: RecentActivityItem[] = appointments.map((appointment) => ({
    type: 'APPOINTMENT',
    id: appointment.id,
    description: `Appointment scheduled with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName} for ${appointment.patient.firstName} ${appointment.patient.lastName}`,
    timestamp: appointment.createdAt,
  }));

  const paymentItems: RecentActivityItem[] = payments.map((payment) => ({
    type: 'PAYMENT',
    id: payment.id,
    description: `Payment of ₹${Number(payment.amount)} received from ${payment.invoice.patient.firstName} ${payment.invoice.patient.lastName} via ${payment.method}`,
    timestamp: payment.paidAt,
  }));

  return [...patientItems, ...appointmentItems, ...paymentItems]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

export const dashboardRepository = {
  countTodayAppointments,
  countTotalPatients,
  countNewPatientsThisMonth,
  getTodayRevenue,
  getPendingPaymentsTotal,
  getAppointmentTrend,
  getRevenueTrend,
  getPatientGrowthTrend,
  getRecentActivity,
};

export type DashboardRepository = typeof dashboardRepository;
