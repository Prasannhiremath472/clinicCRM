import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createInvoice,
  getInvoice,
  getOutstandingInvoices,
  getRevenueSummary,
  listInvoices,
  listPaymentsForInvoice,
  recordPaymentForInvoice,
  suggestInvoiceItems,
} from './invoice.controller';
import {
  createInvoiceSchema,
  invoiceIdParamsSchema,
  listInvoicesQuerySchema,
  revenueSummaryQuerySchema,
  suggestItemsQuerySchema,
} from './invoice.types';
import { recordPaymentSchema } from './payment.types';

const router = Router();

router.use(authenticate, authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'));

router.get('/', validate({ query: listInvoicesQuerySchema }), listInvoices);
router.get('/summary/revenue', validate({ query: revenueSummaryQuerySchema }), getRevenueSummary);
router.get('/summary/outstanding', getOutstandingInvoices);
router.get('/suggest-items', validate({ query: suggestItemsQuerySchema }), suggestInvoiceItems);

router.post(
  '/',
  authorize('CLINIC_ADMIN', 'RECEPTIONIST'),
  validate({ body: createInvoiceSchema }),
  createInvoice
);

router.get('/:id', validate({ params: invoiceIdParamsSchema }), getInvoice);
router.get('/:id/payments', validate({ params: invoiceIdParamsSchema }), listPaymentsForInvoice);
router.post(
  '/:id/payments',
  authorize('CLINIC_ADMIN', 'RECEPTIONIST'),
  validate({ params: invoiceIdParamsSchema, body: recordPaymentSchema }),
  recordPaymentForInvoice
);

export const invoiceRoutes = router;
