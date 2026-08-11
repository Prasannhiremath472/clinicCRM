import { AppointmentStatus, FollowUpStatus, PaymentStatus } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import {
  AppointmentReportRow,
  DoctorPerformanceReportRow,
  FollowUpReportRow,
  PatientReportData,
  reportRepository,
  RevenueReportData,
} from './report.repository';
import { ReportFilters } from './report.types';

function validateAppointmentStatus(status: string | undefined): AppointmentStatus | undefined {
  if (status === undefined) {
    return undefined;
  }
  if (!Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
    throw ApiError.badRequest(`Invalid appointment status: ${status}`);
  }
  return status as AppointmentStatus;
}

function validatePaymentStatus(status: string | undefined): PaymentStatus | undefined {
  if (status === undefined) {
    return undefined;
  }
  if (!Object.values(PaymentStatus).includes(status as PaymentStatus)) {
    throw ApiError.badRequest(`Invalid payment status: ${status}`);
  }
  return status as PaymentStatus;
}

function validateFollowUpStatus(status: string | undefined): FollowUpStatus | undefined {
  if (status === undefined) {
    return undefined;
  }
  if (!Object.values(FollowUpStatus).includes(status as FollowUpStatus)) {
    throw ApiError.badRequest(`Invalid follow-up status: ${status}`);
  }
  return status as FollowUpStatus;
}

function validatePatientActiveStatus(status: string | undefined): boolean | undefined {
  if (status === undefined) {
    return undefined;
  }
  if (status !== 'active' && status !== 'inactive') {
    throw ApiError.badRequest(`Invalid patient status: ${status}. Must be 'active' or 'inactive'`);
  }
  return status === 'active';
}

async function getAppointmentReport(clinicId: string, filters: ReportFilters): Promise<AppointmentReportRow[]> {
  const status = validateAppointmentStatus(filters.status);
  return reportRepository.getAppointmentReportData(clinicId, filters, status);
}

async function getRevenueReport(clinicId: string, filters: ReportFilters): Promise<RevenueReportData> {
  const status = validatePaymentStatus(filters.status);
  return reportRepository.getRevenueReportData(clinicId, filters, status);
}

async function getPatientReport(clinicId: string, filters: ReportFilters): Promise<PatientReportData> {
  const isActive = validatePatientActiveStatus(filters.status);
  return reportRepository.getPatientReportData(clinicId, filters, isActive);
}

async function getDoctorPerformanceReport(
  clinicId: string,
  filters: ReportFilters
): Promise<DoctorPerformanceReportRow[]> {
  return reportRepository.getDoctorPerformanceReportData(clinicId, filters);
}

async function getFollowUpReport(clinicId: string, filters: ReportFilters): Promise<FollowUpReportRow[]> {
  const status = validateFollowUpStatus(filters.status);
  return reportRepository.getFollowUpReportData(clinicId, filters, status);
}

export const reportService = {
  getAppointmentReport,
  getRevenueReport,
  getPatientReport,
  getDoctorPerformanceReport,
  getFollowUpReport,
};
