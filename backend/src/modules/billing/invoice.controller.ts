import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { invoiceService } from './invoice.service';
import { paymentService } from './payment.service';
import { RecordPaymentInput } from './payment.types';
import {
  CreateInvoiceInput,
  InvoiceIdParams,
  ListInvoicesQuery,
  RevenueSummaryQuery,
  SuggestItemsQuery,
} from './invoice.types';

/**
 * clinicId is guaranteed non-null here because every billing route is gated by
 * authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST') at the router level, and
 * SUPER_ADMIN (the only role with a null clinicId) is excluded from that list.
 * This helper exists for defense in depth in case that invariant ever breaks.
 */
function getClinicId(req: Request): string {
  if (!req.user?.clinicId) {
    throw ApiError.forbidden('A clinic context is required to access billing records');
  }
  return req.user.clinicId;
}

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as ListInvoicesQuery;

  const { items, meta } = await invoiceService.listInvoices(clinicId, query);

  sendSuccess(res, items, 'Invoices fetched successfully', 200, meta);
});

export const getRevenueSummary = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const query = req.query as unknown as RevenueSummaryQuery;

  const summary = await invoiceService.getRevenueSummary(clinicId, query);

  sendSuccess(res, summary, 'Revenue summary fetched successfully');
});

export const getOutstandingInvoices = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);

  const invoices = await invoiceService.getOutstandingInvoices(clinicId);

  sendSuccess(res, invoices, 'Outstanding invoices fetched successfully');
});

export const suggestInvoiceItems = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { appointmentId } = req.query as unknown as SuggestItemsQuery;

  const items = await invoiceService.suggestInvoiceItems(appointmentId, clinicId);

  sendSuccess(res, items, 'Suggested items fetched successfully');
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as InvoiceIdParams;

  const invoice = await invoiceService.getInvoice(id, clinicId);

  sendSuccess(res, invoice, 'Invoice fetched successfully');
});

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const createdById = req.user!.id;
  const input = req.body as CreateInvoiceInput;

  const invoice = await invoiceService.createInvoice(clinicId, createdById, input);

  sendSuccess(res, invoice, 'Invoice created successfully', 201);
});

export const recordPaymentForInvoice = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as InvoiceIdParams;
  const collectedById = req.user!.id;
  const input = req.body as RecordPaymentInput;

  const payment = await paymentService.recordPayment(id, clinicId, collectedById, input);

  sendSuccess(res, payment, 'Payment recorded successfully', 201);
});

export const listPaymentsForInvoice = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = getClinicId(req);
  const { id } = req.params as unknown as InvoiceIdParams;

  const payments = await paymentService.listPaymentsForInvoice(id, clinicId);

  sendSuccess(res, payments, 'Payments fetched successfully');
});
