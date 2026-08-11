import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { PaymentMethod, PaymentStatus, Role } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  patient: {
    findFirst: vi.fn(),
  },
  appointment: {
    findFirst: vi.fn(),
  },
  clinic: {
    findUnique: vi.fn(),
  },
  invoice: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  invoiceItem: {
    createMany: vi.fn(),
  },
  payment: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  $transaction: vi.fn(),
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

import { errorHandler } from '../src/middleware/errorHandler';
import { notFoundHandler } from '../src/middleware/notFoundHandler';
import { invoiceRoutes } from '../src/modules/billing/invoice.routes';
import { paymentRoutes } from '../src/modules/billing/payment.routes';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/invoices', invoiceRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const CLINIC_ID = 'clinic-1';
const OTHER_CLINIC_ID = 'clinic-2';
const PATIENT_UUID = '123e4567-e89b-12d3-a456-426614174001';
const DOCTOR_UUID = '123e4567-e89b-12d3-a456-426614174002';
const APPOINTMENT_UUID = '123e4567-e89b-12d3-a456-426614174003';
const INVOICE_UUID = '123e4567-e89b-12d3-a456-426614174004';
const PAYMENT_UUID = '123e4567-e89b-12d3-a456-426614174005';
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
    clinicId: CLINIC_ID,
    deletedAt: null,
    ...overrides,
  };
}

function makeAppointment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: APPOINTMENT_UUID,
    clinicId: CLINIC_ID,
    patientId: PATIENT_UUID,
    doctorId: DOCTOR_UUID,
    doctor: {
      id: DOCTOR_UUID,
      consultationFee: 500,
    },
    ...overrides,
  };
}

function makeInvoiceItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'item-1',
    invoiceId: INVOICE_UUID,
    description: 'Consultation Fee',
    quantity: 1,
    unitPrice: 500,
    amount: 500,
    ...overrides,
  };
}

function makeInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: INVOICE_UUID,
    invoiceNumber: 'INV-2026-000001',
    clinicId: CLINIC_ID,
    patientId: PATIENT_UUID,
    appointmentId: null,
    subtotal: 500,
    discount: 0,
    tax: 0,
    totalAmount: 500,
    paidAmount: 0,
    status: PaymentStatus.PENDING,
    createdById: STAFF_USER_UUID,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: makePatient(),
    createdBy: { id: STAFF_USER_UUID, firstName: 'Staff', lastName: 'User', role: Role.RECEPTIONIST },
    items: [makeInvoiceItem()],
    payments: [],
    ...overrides,
  };
}

function makePayment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: PAYMENT_UUID,
    receiptNumber: 'RCT-2026-000001',
    invoiceId: INVOICE_UUID,
    amount: 200,
    method: PaymentMethod.CASH,
    referenceNumber: null,
    collectedById: STAFF_USER_UUID,
    paidAt: new Date(),
    notes: null,
    collectedBy: { id: STAFF_USER_UUID, firstName: 'Staff', lastName: 'User', role: Role.RECEPTIONIST },
    invoice: makeInvoice(),
    ...overrides,
  };
}

describe('Billing module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /invoices (create invoice)', () => {
    it('creates an invoice computing item amounts and invoiceNumber server-side', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(makePatient());
      prismaMock.invoice.count.mockResolvedValueOnce(0); // sequence
      prismaMock.$transaction.mockImplementationOnce(async (cb: any) =>
        cb({
          invoice: { create: vi.fn().mockResolvedValueOnce(makeInvoice({ items: undefined, payments: undefined })) },
          invoiceItem: { createMany: vi.fn().mockResolvedValueOnce({ count: 1 }) },
        })
      );
      prismaMock.invoice.findUnique.mockResolvedValueOnce(makeInvoice());

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({
          patientId: PATIENT_UUID,
          items: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 500 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.invoiceNumber).toBe('INV-2026-000001');
      expect(prismaMock.$transaction).toHaveBeenCalled();
      const transactionFn = prismaMock.$transaction.mock.calls[0][0];
      const createMock = vi.fn().mockResolvedValueOnce(makeInvoice());
      const createManyMock = vi.fn().mockResolvedValueOnce({ count: 1 });
      await transactionFn({ invoice: { create: createMock }, invoiceItem: { createMany: createManyMock } });
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subtotal: 500, totalAmount: 500, paidAmount: 0 }),
        })
      );
      expect(createManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ description: 'Consultation Fee', amount: 500 })],
        })
      );
    });

    it('computes totalAmount correctly with discount and tax', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(makePatient());
      prismaMock.invoice.count.mockResolvedValueOnce(0);
      prismaMock.$transaction.mockImplementationOnce(async (cb: any) => {
        const createMock = vi.fn().mockResolvedValueOnce(makeInvoice());
        const createManyMock = vi.fn().mockResolvedValueOnce({ count: 2 });
        await cb({ invoice: { create: createMock }, invoiceItem: { createMany: createManyMock } });
        expect(createMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ subtotal: 700, discount: 50, tax: 18, totalAmount: 668 }),
          })
        );
        return makeInvoice().id;
      });
      prismaMock.invoice.findUnique.mockResolvedValueOnce(makeInvoice({ subtotal: 700, discount: 50, tax: 18, totalAmount: 668 }));

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`)
        .send({
          patientId: PATIENT_UUID,
          items: [
            { description: 'Consultation Fee', quantity: 1, unitPrice: 500 },
            { description: 'Procedure Charges', quantity: 2, unitPrice: 100 },
          ],
          discount: 50,
          tax: 18,
        });

      expect(res.status).toBe(201);
    });

    it('rejects a discount that exceeds the subtotal with 400', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(makePatient());

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({
          patientId: PATIENT_UUID,
          items: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 100 }],
          discount: 200,
        });

      expect(res.status).toBe(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an empty items array with 400 validation error', async () => {
      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ patientId: PATIENT_UUID, items: [] });

      expect(res.status).toBe(400);
      expect(prismaMock.patient.findFirst).not.toHaveBeenCalled();
    });

    it('rejects DOCTOR from creating an invoice with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({
          patientId: PATIENT_UUID,
          items: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 500 }],
        });

      expect(res.status).toBe(403);
      expect(prismaMock.patient.findFirst).not.toHaveBeenCalled();
    });

    it('allows DOCTOR to view invoices (read-only access)', async () => {
      prismaMock.invoice.findMany.mockResolvedValueOnce([makeInvoice()]);
      prismaMock.invoice.count.mockResolvedValueOnce(1);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('404s when the patient does not belong to the clinic', async () => {
      prismaMock.patient.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({
          patientId: PATIENT_UUID,
          items: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 500 }],
        });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /invoices/:id/payments (record payment)', () => {
    it('transitions invoice status PENDING -> PARTIAL -> PAID across two partial payments', async () => {
      // First payment: 200 of 500 -> PARTIAL
      const invoiceAfterFirst = makeInvoice({ paidAmount: 0, status: PaymentStatus.PENDING });
      prismaMock.invoice.findFirst.mockResolvedValueOnce(invoiceAfterFirst);
      prismaMock.payment.count.mockResolvedValueOnce(0);
      prismaMock.$transaction.mockImplementationOnce(async (cb: any) => {
        const createMock = vi.fn().mockResolvedValueOnce(makePayment({ amount: 200 }));
        const updateMock = vi.fn().mockResolvedValueOnce({});
        return cb({ payment: { create: createMock }, invoice: { update: updateMock } }).then((created: any) => {
          expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ paidAmount: 200, status: PaymentStatus.PARTIAL }) })
          );
          return created;
        });
      });
      prismaMock.payment.findFirst.mockResolvedValueOnce(
        makePayment({ amount: 200, invoice: makeInvoice({ paidAmount: 200, status: PaymentStatus.PARTIAL }) })
      );

      const app = buildApp();
      const res1 = await request(app)
        .post(`/api/v1/invoices/${INVOICE_UUID}/payments`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ amount: 200, method: 'CASH' });

      expect(res1.status).toBe(201);

      // Second payment: remaining 300 -> PAID
      const invoiceAfterSecondLookup = makeInvoice({ paidAmount: 200, status: PaymentStatus.PARTIAL });
      prismaMock.invoice.findFirst.mockResolvedValueOnce(invoiceAfterSecondLookup);
      prismaMock.payment.count.mockResolvedValueOnce(1);
      prismaMock.$transaction.mockImplementationOnce(async (cb: any) => {
        const createMock = vi.fn().mockResolvedValueOnce(makePayment({ amount: 300 }));
        const updateMock = vi.fn().mockResolvedValueOnce({});
        return cb({ payment: { create: createMock }, invoice: { update: updateMock } }).then((created: any) => {
          expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ paidAmount: 500, status: PaymentStatus.PAID }) })
          );
          return created;
        });
      });
      prismaMock.payment.findFirst.mockResolvedValueOnce(
        makePayment({ amount: 300, invoice: makeInvoice({ paidAmount: 500, status: PaymentStatus.PAID }) })
      );

      const res2 = await request(app)
        .post(`/api/v1/invoices/${INVOICE_UUID}/payments`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ amount: 300, method: 'UPI', referenceNumber: 'UPI123' });

      expect(res2.status).toBe(201);
    });

    it('rejects a payment exceeding the remaining balance with 400', async () => {
      prismaMock.invoice.findFirst.mockResolvedValueOnce(makeInvoice({ paidAmount: 100, totalAmount: 500 }));

      const app = buildApp();
      const res = await request(app)
        .post(`/api/v1/invoices/${INVOICE_UUID}/payments`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ amount: 1000, method: 'CASH' });

      expect(res.status).toBe(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects recording a payment on an already-paid invoice with 400', async () => {
      prismaMock.invoice.findFirst.mockResolvedValueOnce(
        makeInvoice({ paidAmount: 500, totalAmount: 500, status: PaymentStatus.PAID })
      );

      const app = buildApp();
      const res = await request(app)
        .post(`/api/v1/invoices/${INVOICE_UUID}/payments`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`)
        .send({ amount: 50, method: 'CASH' });

      expect(res.status).toBe(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects DOCTOR from recording a payment with 403', async () => {
      const app = buildApp();
      const res = await request(app)
        .post(`/api/v1/invoices/${INVOICE_UUID}/payments`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR)}`)
        .send({ amount: 50, method: 'CASH' });

      expect(res.status).toBe(403);
      expect(prismaMock.invoice.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('GET /invoices/summary/revenue', () => {
    it('aggregates revenue, invoiced, and outstanding totals from payments and invoices', async () => {
      prismaMock.payment.aggregate.mockResolvedValueOnce({
        _sum: { amount: 700 },
        _count: { _all: 2 },
      });
      prismaMock.invoice.aggregate.mockResolvedValueOnce({
        _sum: { totalAmount: 1000, paidAmount: 700 },
        _count: { _all: 3 },
      });

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/invoices/summary/revenue')
        .query({ fromDate: '2026-01-01', toDate: '2026-01-31' })
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        totalRevenue: 700,
        totalInvoiced: 1000,
        totalOutstanding: 300,
        paymentCount: 2,
        invoiceCount: 3,
      });
    });

    it('rejects a toDate before fromDate with 400', async () => {
      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/invoices/summary/revenue')
        .query({ fromDate: '2026-01-31', toDate: '2026-01-01' })
        .set('Authorization', `Bearer ${tokenFor(Role.CLINIC_ADMIN)}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /invoices/summary/outstanding', () => {
    it('lists invoices with PENDING or PARTIAL status', async () => {
      prismaMock.invoice.findMany.mockResolvedValueOnce([
        makeInvoice({ status: PaymentStatus.PARTIAL }),
        makeInvoice({ id: 'inv-2', status: PaymentStatus.PENDING }),
      ]);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/invoices/summary/outstanding')
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinicId: CLINIC_ID,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
          }),
        })
      );
    });
  });

  describe('GET /invoices/suggest-items', () => {
    it("returns the doctor's consultation fee as a suggested line item", async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(makeAppointment());

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/invoices/suggest-items')
        .query({ appointmentId: APPOINTMENT_UUID })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([{ description: 'Consultation Fee', quantity: 1, unitPrice: 500 }]);
    });

    it('returns an empty array when the appointment has no doctor fee on record', async () => {
      prismaMock.appointment.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .get('/api/v1/invoices/suggest-items')
        .query({ appointmentId: APPOINTMENT_UUID })
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('Tenant isolation', () => {
    it('returns 404 when the invoice belongs to a different clinic', async () => {
      prismaMock.invoice.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/invoices/${INVOICE_UUID}`)
        .set('Authorization', `Bearer ${tokenFor(Role.DOCTOR, OTHER_CLINIC_ID)}`);

      expect(res.status).toBe(404);
      expect(prismaMock.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinicId: OTHER_CLINIC_ID }) })
      );
    });
  });

  describe('GET /payments/:id/receipt', () => {
    it('generates a PDF receipt for a valid payment', async () => {
      prismaMock.payment.findFirst.mockResolvedValueOnce(makePayment());
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
        .get(`/api/v1/payments/${PAYMENT_UUID}/receipt`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });

    it('returns 404 for a payment not found in the clinic', async () => {
      prismaMock.payment.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .get(`/api/v1/payments/${PAYMENT_UUID}/receipt`)
        .set('Authorization', `Bearer ${tokenFor(Role.RECEPTIONIST)}`);

      expect(res.status).toBe(404);
    });
  });
});
