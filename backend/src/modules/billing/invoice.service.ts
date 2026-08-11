import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { buildPaginationMeta, PaginationMeta } from '../../utils/apiResponse';
import { patientRepository } from '../patients/patient.repository';
import {
  CreateInvoiceItemData,
  invoiceRepository,
  InvoiceWithDetails,
  RevenueSummary,
} from './invoice.repository';
import { CreateInvoiceInput, ListInvoicesQuery, RevenueSummaryQuery } from './invoice.types';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function ensurePatientBelongsToClinic(patientId: string, clinicId: string): Promise<void> {
  const patient = await patientRepository.findById(patientId, clinicId);
  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }
}

async function ensureAppointmentBelongsToClinic(appointmentId: string, clinicId: string): Promise<void> {
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, clinicId } });
  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }
}

async function createInvoice(
  clinicId: string,
  createdById: string,
  input: CreateInvoiceInput
): Promise<InvoiceWithDetails> {
  await ensurePatientBelongsToClinic(input.patientId, clinicId);

  if (input.appointmentId) {
    await ensureAppointmentBelongsToClinic(input.appointmentId, clinicId);
  }

  const items: CreateInvoiceItemData[] = input.items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: round2(item.quantity * item.unitPrice),
  }));

  const subtotal = round2(items.reduce((sum, item) => sum + item.amount, 0));
  const discount = round2(input.discount);
  const tax = round2(input.tax);

  if (discount > subtotal) {
    throw ApiError.badRequest('Discount cannot exceed the invoice subtotal');
  }

  const totalAmount = round2(subtotal - discount + tax);

  return invoiceRepository.create(
    clinicId,
    {
      patientId: input.patientId,
      appointmentId: input.appointmentId ?? null,
      items,
      subtotal,
      discount,
      tax,
      totalAmount,
    },
    createdById
  );
}

async function getInvoice(id: string, clinicId: string): Promise<InvoiceWithDetails> {
  const invoice = await invoiceRepository.findById(id, clinicId);

  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }

  return invoice;
}

async function listInvoices(
  clinicId: string,
  query: ListInvoicesQuery
): Promise<{ items: InvoiceWithDetails[]; meta: PaginationMeta }> {
  const { items, totalItems } = await invoiceRepository.list(clinicId, query);

  return {
    items,
    meta: buildPaginationMeta(query.page, query.pageSize, totalItems),
  };
}

async function getRevenueSummary(clinicId: string, query: RevenueSummaryQuery): Promise<RevenueSummary> {
  const fromDate = new Date(query.fromDate);
  const toDate = new Date(query.toDate);

  return invoiceRepository.getRevenueSummary(clinicId, fromDate, toDate);
}

function getOutstandingInvoices(clinicId: string): Promise<InvoiceWithDetails[]> {
  return invoiceRepository.getOutstandingInvoices(clinicId);
}

export interface SuggestedInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

async function suggestInvoiceItems(appointmentId: string, clinicId: string): Promise<SuggestedInvoiceItem[]> {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId },
    include: { doctor: true },
  });

  if (!appointment || !appointment.doctor) {
    return [];
  }

  return [
    {
      description: 'Consultation Fee',
      quantity: 1,
      unitPrice: Number(appointment.doctor.consultationFee),
    },
  ];
}

export const invoiceService = {
  createInvoice,
  getInvoice,
  listInvoices,
  getRevenueSummary,
  getOutstandingInvoices,
  suggestInvoiceItems,
};
