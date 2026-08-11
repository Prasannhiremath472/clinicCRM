import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { ReportColumn, reportExport } from './report.export';
import {
  AppointmentReportRow,
  DoctorPerformanceReportRow,
  FollowUpReportRow,
  PatientReportRow,
  RevenueReportRow,
} from './report.repository';
import { reportService } from './report.service';
import { ReportQuery } from './report.types';

/**
 * clinicId is guaranteed non-null here because every reports route is gated by
 * authorize(...) at the router level, restricted to roles that always carry a clinicId.
 * This helper exists for defense in depth in case that invariant ever breaks.
 */
function getClinicId(req: Request): string {
  if (!req.user?.clinicId) {
    throw ApiError.forbidden('A clinic context is required to access reports');
  }
  return req.user.clinicId;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

function buildFilterSummaryLine(query: ReportQuery, doctorName?: string, patientName?: string): string {
  const parts = [`Date Range: ${query.fromDate} to ${query.toDate}`];
  if (doctorName) {
    parts.push(`Doctor: ${doctorName}`);
  }
  if (patientName) {
    parts.push(`Patient: ${patientName}`);
  }
  if (query.status) {
    parts.push(`Status: ${query.status}`);
  }
  return parts.join(' | ');
}

async function resolveDoctorName(doctorId: string | undefined): Promise<string | undefined> {
  if (!doctorId) {
    return undefined;
  }
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { user: { select: { firstName: true, lastName: true } } },
  });
  return doctor ? `${doctor.user.firstName} ${doctor.user.lastName}` : undefined;
}

async function resolvePatientName(patientId: string | undefined): Promise<string | undefined> {
  if (!patientId) {
    return undefined;
  }
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { firstName: true, lastName: true },
  });
  return patient ? `${patient.firstName} ${patient.lastName}` : undefined;
}

async function getClinicInfo(clinicId: string) {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) {
    throw ApiError.notFound('Clinic not found');
  }
  return clinic;
}

async function sendExport(
  res: Response,
  format: 'pdf' | 'excel',
  reportTitle: string,
  fileBaseName: string,
  columns: ReportColumn[],
  rows: Record<string, string>[],
  filterSummaryLine: string,
  summaryLines: string[],
  clinicId: string
): Promise<void> {
  if (format === 'pdf') {
    const clinic = await getClinicInfo(clinicId);
    const buffer = await reportExport.exportReportAsPdf(reportTitle, columns, rows, filterSummaryLine, summaryLines, clinic);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileBaseName}.pdf"`);
    res.send(buffer);
    return;
  }

  const buffer = await reportExport.exportReportAsExcel(reportTitle, columns, rows, summaryLines);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileBaseName}.xlsx"`);
  res.send(buffer);
}

const APPOINTMENT_COLUMNS: ReportColumn[] = [
  { header: 'Appointment Code', key: 'appointmentCode', width: 100 },
  { header: 'Patient', key: 'patientName', width: 110 },
  { header: 'Doctor', key: 'doctorName', width: 110 },
  { header: 'Date', key: 'date', width: 70 },
  { header: 'Time', key: 'time', width: 50 },
  { header: 'Type', key: 'type', width: 60 },
  { header: 'Status', key: 'status', width: 60 },
];

function toAppointmentRow(row: AppointmentReportRow): Record<string, string> {
  return {
    appointmentCode: row.appointmentCode,
    patientName: row.patientName,
    doctorName: row.doctorName,
    date: formatDateOnly(row.date),
    time: row.time,
    type: row.type,
    status: row.status,
  };
}

export const getAppointmentReport = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ReportQuery;

  const data = await reportService.getAppointmentReport(clinicId, query);

  if (query.format === 'json') {
    sendSuccess(res, { rows: data }, 'Appointment report fetched successfully');
    return;
  }

  const [doctorName, patientName] = await Promise.all([
    resolveDoctorName(query.doctorId),
    resolvePatientName(query.patientId),
  ]);
  const filterSummaryLine = buildFilterSummaryLine(query, doctorName, patientName);

  await sendExport(
    res,
    query.format,
    'Appointment Report',
    'appointment-report',
    APPOINTMENT_COLUMNS,
    data.map(toAppointmentRow),
    filterSummaryLine,
    [],
    clinicId
  );
});

const REVENUE_COLUMNS: ReportColumn[] = [
  { header: 'Receipt No', key: 'receiptNumber', width: 100 },
  { header: 'Invoice No', key: 'invoiceNumber', width: 100 },
  { header: 'Patient', key: 'patientName', width: 110 },
  { header: 'Amount', key: 'amount', width: 70 },
  { header: 'Method', key: 'method', width: 70 },
  { header: 'Paid At', key: 'paidAt', width: 110 },
  { header: 'Collected By', key: 'collectedByName', width: 100 },
];

function toRevenueRow(row: RevenueReportRow): Record<string, string> {
  return {
    receiptNumber: row.receiptNumber,
    invoiceNumber: row.invoiceNumber,
    patientName: row.patientName,
    amount: formatCurrency(row.amount),
    method: row.method,
    paidAt: formatDateTime(row.paidAt),
    collectedByName: row.collectedByName,
  };
}

export const getRevenueReport = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ReportQuery;

  const data = await reportService.getRevenueReport(clinicId, query);

  if (query.format === 'json') {
    sendSuccess(res, { rows: data.rows, summary: data.summary }, 'Revenue report fetched successfully');
    return;
  }

  const [doctorName, patientName] = await Promise.all([
    resolveDoctorName(query.doctorId),
    resolvePatientName(query.patientId),
  ]);
  const filterSummaryLine = buildFilterSummaryLine(query, doctorName, patientName);
  const summaryLines = [
    `Total Revenue: Rs. ${formatCurrency(data.summary.totalRevenue)}`,
    `Payment Count: ${data.summary.paymentCount}`,
  ];

  await sendExport(
    res,
    query.format,
    'Revenue Report',
    'revenue-report',
    REVENUE_COLUMNS,
    data.rows.map(toRevenueRow),
    filterSummaryLine,
    summaryLines,
    clinicId
  );
});

const PATIENT_COLUMNS: ReportColumn[] = [
  { header: 'Patient Code', key: 'patientCode', width: 100 },
  { header: 'Name', key: 'name', width: 120 },
  { header: 'Gender', key: 'gender', width: 60 },
  { header: 'Age', key: 'age', width: 40 },
  { header: 'Mobile', key: 'mobileNumber', width: 90 },
  { header: 'Registered On', key: 'registeredOn', width: 90 },
];

function toPatientRow(row: PatientReportRow): Record<string, string> {
  return {
    patientCode: row.patientCode,
    name: row.name,
    gender: row.gender,
    age: String(row.age),
    mobileNumber: row.mobileNumber,
    registeredOn: formatDateOnly(row.registeredOn),
  };
}

export const getPatientReport = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ReportQuery;

  const data = await reportService.getPatientReport(clinicId, query);

  if (query.format === 'json') {
    sendSuccess(res, { rows: data.rows, summary: data.summary }, 'Patient report fetched successfully');
    return;
  }

  const filterSummaryLine = buildFilterSummaryLine(query);
  const summaryLines = [
    `Total Patients (all-time): ${data.summary.totalPatients}`,
    `New Patients In Range: ${data.summary.newInRange}`,
  ];

  await sendExport(
    res,
    query.format,
    'Patient Report',
    'patient-report',
    PATIENT_COLUMNS,
    data.rows.map(toPatientRow),
    filterSummaryLine,
    summaryLines,
    clinicId
  );
});

const DOCTOR_PERFORMANCE_COLUMNS: ReportColumn[] = [
  { header: 'Doctor', key: 'doctorName', width: 120 },
  { header: 'Specialization', key: 'specialization', width: 110 },
  { header: 'Appointments Completed', key: 'appointmentsCompleted', width: 100 },
  { header: 'Consultations Conducted', key: 'consultationsConducted', width: 100 },
  { header: 'Revenue Generated', key: 'revenueGenerated', width: 90 },
];

function toDoctorPerformanceRow(row: DoctorPerformanceReportRow): Record<string, string> {
  return {
    doctorName: row.doctorName,
    specialization: row.specialization,
    appointmentsCompleted: String(row.appointmentsCompleted),
    consultationsConducted: String(row.consultationsConducted),
    revenueGenerated: formatCurrency(row.revenueGenerated),
  };
}

export const getDoctorPerformanceReport = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ReportQuery;

  const data = await reportService.getDoctorPerformanceReport(clinicId, query);

  if (query.format === 'json') {
    sendSuccess(res, { rows: data }, 'Doctor performance report fetched successfully');
    return;
  }

  const doctorName = await resolveDoctorName(query.doctorId);
  const filterSummaryLine = buildFilterSummaryLine(query, doctorName);

  await sendExport(
    res,
    query.format,
    'Doctor Performance Report',
    'doctor-performance-report',
    DOCTOR_PERFORMANCE_COLUMNS,
    data.map(toDoctorPerformanceRow),
    filterSummaryLine,
    [],
    clinicId
  );
});

const FOLLOW_UP_COLUMNS: ReportColumn[] = [
  { header: 'Patient', key: 'patientName', width: 120 },
  { header: 'Follow-up Date', key: 'followUpDate', width: 90 },
  { header: 'Reason', key: 'reason', width: 150 },
  { header: 'Status', key: 'status', width: 70 },
  { header: 'Overdue', key: 'isOverdue', width: 60 },
];

function toFollowUpRow(row: FollowUpReportRow): Record<string, string> {
  return {
    patientName: row.patientName,
    followUpDate: formatDateOnly(row.followUpDate),
    reason: row.reason,
    status: row.status,
    isOverdue: row.isOverdue ? 'Yes' : 'No',
  };
}

export const getFollowUpReport = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ReportQuery;

  const data = await reportService.getFollowUpReport(clinicId, query);

  if (query.format === 'json') {
    sendSuccess(res, { rows: data }, 'Follow-up report fetched successfully');
    return;
  }

  const patientName = await resolvePatientName(query.patientId);
  const filterSummaryLine = buildFilterSummaryLine(query, undefined, patientName);

  await sendExport(
    res,
    query.format,
    'Follow-up Report',
    'follow-up-report',
    FOLLOW_UP_COLUMNS,
    data.map(toFollowUpRow),
    filterSummaryLine,
    [],
    clinicId
  );
});
