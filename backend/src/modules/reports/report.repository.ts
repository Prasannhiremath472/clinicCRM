import { AppointmentStatus, FollowUpStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ReportFilters } from './report.types';

const SAFE_PATIENT_SELECT = {
  id: true,
  patientCode: true,
  firstName: true,
  lastName: true,
  mobileNumber: true,
} satisfies Prisma.PatientSelect;

const SAFE_DOCTOR_USER_SELECT = {
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

export interface AppointmentReportRow {
  appointmentCode: string;
  patientName: string;
  doctorName: string;
  date: Date;
  time: string;
  type: string;
  status: AppointmentStatus;
}

async function getAppointmentReportData(
  clinicId: string,
  filters: ReportFilters,
  status?: AppointmentStatus
): Promise<AppointmentReportRow[]> {
  const where: Prisma.AppointmentWhereInput = {
    clinicId,
    appointmentDate: {
      gte: new Date(filters.fromDate),
      lte: new Date(filters.toDate),
    },
    ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
    ...(filters.patientId ? { patientId: filters.patientId } : {}),
    ...(status ? { status } : {}),
  };

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: { select: SAFE_PATIENT_SELECT },
      doctor: { select: { user: { select: SAFE_DOCTOR_USER_SELECT } } },
    },
    orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
  });

  return appointments.map((appointment) => ({
    appointmentCode: appointment.appointmentCode,
    patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    doctorName: `${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
    date: appointment.appointmentDate,
    time: appointment.startTime,
    type: appointment.type,
    status: appointment.status,
  }));
}

export interface RevenueReportRow {
  receiptNumber: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  method: string;
  paidAt: Date;
  collectedByName: string;
}

export interface RevenueReportData {
  rows: RevenueReportRow[];
  summary: { totalRevenue: number; paymentCount: number };
}

async function getRevenueReportData(
  clinicId: string,
  filters: ReportFilters,
  status?: PaymentStatus
): Promise<RevenueReportData> {
  const where: Prisma.PaymentWhereInput = {
    invoice: {
      clinicId,
      ...(filters.patientId ? { patientId: filters.patientId } : {}),
      ...(filters.doctorId ? { appointment: { doctorId: filters.doctorId } } : {}),
      ...(status ? { status } : {}),
    },
    paidAt: {
      gte: new Date(filters.fromDate),
      lte: new Date(filters.toDate),
    },
  };

  const payments = await prisma.payment.findMany({
    where,
    include: {
      invoice: { select: { invoiceNumber: true, patient: { select: SAFE_PATIENT_SELECT } } },
      collectedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { paidAt: 'asc' },
  });

  const rows: RevenueReportRow[] = payments.map((payment) => ({
    receiptNumber: payment.receiptNumber,
    invoiceNumber: payment.invoice.invoiceNumber,
    patientName: `${payment.invoice.patient.firstName} ${payment.invoice.patient.lastName}`,
    amount: Number(payment.amount),
    method: payment.method,
    paidAt: payment.paidAt,
    collectedByName: `${payment.collectedBy.firstName} ${payment.collectedBy.lastName}`,
  }));

  const totalRevenue = rows.reduce((sum, row) => sum + row.amount, 0);

  return {
    rows,
    summary: { totalRevenue, paymentCount: rows.length },
  };
}

export interface PatientReportRow {
  patientCode: string;
  name: string;
  gender: string;
  age: number;
  mobileNumber: string;
  registeredOn: Date;
}

export interface PatientReportData {
  rows: PatientReportRow[];
  summary: { totalPatients: number; newInRange: number };
}

function computeAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

async function getPatientReportData(
  clinicId: string,
  filters: ReportFilters,
  isActive?: boolean
): Promise<PatientReportData> {
  const where: Prisma.PatientWhereInput = {
    clinicId,
    deletedAt: null,
    createdAt: {
      gte: new Date(filters.fromDate),
      lte: new Date(filters.toDate),
    },
    ...(isActive !== undefined ? { isActive } : {}),
  };

  const [patients, totalPatients] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.patient.count({ where: { clinicId, deletedAt: null, isActive: true } }),
  ]);

  const rows: PatientReportRow[] = patients.map((patient) => ({
    patientCode: patient.patientCode,
    name: `${patient.firstName} ${patient.lastName}`,
    gender: patient.gender,
    age: computeAge(patient.dateOfBirth),
    mobileNumber: patient.mobileNumber,
    registeredOn: patient.createdAt,
  }));

  return {
    rows,
    summary: { totalPatients, newInRange: rows.length },
  };
}

export interface DoctorPerformanceReportRow {
  doctorName: string;
  specialization: string;
  appointmentsCompleted: number;
  consultationsConducted: number;
  revenueGenerated: number;
}

async function getDoctorPerformanceReportData(
  clinicId: string,
  filters: ReportFilters
): Promise<DoctorPerformanceReportRow[]> {
  const fromDate = new Date(filters.fromDate);
  const toDate = new Date(filters.toDate);

  const doctors = await prisma.doctor.findMany({
    where: {
      clinicId,
      isActive: true,
      ...(filters.doctorId ? { id: filters.doctorId } : {}),
    },
    include: { user: { select: SAFE_DOCTOR_USER_SELECT } },
  });

  const rows = await Promise.all(
    doctors.map(async (doctor) => {
      const [appointmentsCompleted, consultationsConducted, revenueAgg] = await Promise.all([
        prisma.appointment.count({
          where: {
            clinicId,
            doctorId: doctor.id,
            status: AppointmentStatus.COMPLETED,
            appointmentDate: { gte: fromDate, lte: toDate },
          },
        }),
        prisma.consultation.count({
          where: {
            doctorId: doctor.id,
            createdAt: { gte: fromDate, lte: toDate },
          },
        }),
        prisma.payment.aggregate({
          where: {
            invoice: { clinicId, appointment: { doctorId: doctor.id } },
            paidAt: { gte: fromDate, lte: toDate },
          },
          _sum: { amount: true },
        }),
      ]);

      return {
        doctorName: `${doctor.user.firstName} ${doctor.user.lastName}`,
        specialization: doctor.specialization,
        appointmentsCompleted,
        consultationsConducted,
        revenueGenerated: revenueAgg._sum.amount ? Number(revenueAgg._sum.amount) : 0,
      };
    })
  );

  return rows;
}

export interface FollowUpReportRow {
  patientName: string;
  followUpDate: Date;
  reason: string;
  status: FollowUpStatus;
  isOverdue: boolean;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function computeIsOverdue(followUpDate: Date, status: FollowUpStatus): boolean {
  const date = new Date(followUpDate);
  date.setHours(0, 0, 0, 0);
  return (
    date.getTime() < startOfToday().getTime() &&
    (status === FollowUpStatus.PENDING || status === FollowUpStatus.SENT)
  );
}

async function getFollowUpReportData(
  clinicId: string,
  filters: ReportFilters,
  status?: FollowUpStatus
): Promise<FollowUpReportRow[]> {
  const where: Prisma.FollowUpWhereInput = {
    clinicId,
    followUpDate: {
      gte: new Date(filters.fromDate),
      lte: new Date(filters.toDate),
    },
    ...(filters.patientId ? { patientId: filters.patientId } : {}),
    ...(status ? { status } : {}),
  };

  const followUps = await prisma.followUp.findMany({
    where,
    include: { patient: { select: SAFE_PATIENT_SELECT } },
    orderBy: { followUpDate: 'asc' },
  });

  return followUps.map((followUp) => ({
    patientName: `${followUp.patient.firstName} ${followUp.patient.lastName}`,
    followUpDate: followUp.followUpDate,
    reason: followUp.reason,
    status: followUp.status,
    isOverdue: computeIsOverdue(followUp.followUpDate, followUp.status),
  }));
}

export const reportRepository = {
  getAppointmentReportData,
  getRevenueReportData,
  getPatientReportData,
  getDoctorPerformanceReportData,
  getFollowUpReportData,
};

export type ReportRepository = typeof reportRepository;
