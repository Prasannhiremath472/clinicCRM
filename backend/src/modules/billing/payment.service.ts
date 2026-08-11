import { Clinic, PaymentStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { invoiceRepository } from './invoice.repository';
import { paymentRepository, PaymentWithInvoice, SafePatient } from './payment.repository';
import { RecordPaymentInput } from './payment.types';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function recordPayment(
  invoiceId: string,
  clinicId: string,
  collectedById: string,
  input: RecordPaymentInput
): Promise<PaymentWithInvoice> {
  const invoice = await invoiceRepository.findById(invoiceId, clinicId);

  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }

  if (invoice.status === PaymentStatus.PAID) {
    throw ApiError.badRequest('Invoice is already fully paid');
  }

  const totalAmount = Number(invoice.totalAmount);
  const currentPaidAmount = Number(invoice.paidAmount);
  const remaining = round2(totalAmount - currentPaidAmount);

  if (round2(input.amount) > remaining) {
    throw ApiError.badRequest('Payment amount exceeds remaining balance');
  }

  const { payment } = await paymentRepository.create(
    invoiceId,
    currentPaidAmount,
    totalAmount,
    {
      amount: input.amount,
      method: input.method,
      referenceNumber: input.referenceNumber ?? null,
      notes: input.notes ?? null,
    },
    collectedById
  );

  const result = await paymentRepository.findById(payment.id, clinicId);

  if (!result) {
    throw new Error('Failed to load payment after creation');
  }

  return result;
}

function listPaymentsForInvoice(invoiceId: string, clinicId: string) {
  return paymentRepository.listForInvoice(invoiceId, clinicId);
}

async function getPayment(id: string, clinicId: string): Promise<PaymentWithInvoice> {
  const payment = await paymentRepository.findById(id, clinicId);

  if (!payment) {
    throw ApiError.notFound('Payment not found');
  }

  return payment;
}

function generateReceiptPdf(params: {
  payment: PaymentWithInvoice;
  patient: SafePatient;
  clinic: Clinic;
}): Promise<Buffer> {
  const { payment, patient, clinic } = params;
  const invoice = payment.invoice;
  const totalAmount = Number(invoice.totalAmount);
  const paidAmount = Number(invoice.paidAmount);
  const balance = Math.max(0, round2(totalAmount - paidAmount));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (error) => reject(error));

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ---- Clinic header ----
    doc.fontSize(18).font('Helvetica-Bold').text(clinic.name, { align: 'center' });
    doc.fontSize(9).font('Helvetica');
    const addressParts = [clinic.address, clinic.city, clinic.state, clinic.pincode].filter(Boolean);
    if (addressParts.length > 0) {
      doc.text(addressParts.join(', '), { align: 'center' });
    }
    const contactParts = [clinic.phone ? `Phone: ${clinic.phone}` : null, clinic.email ? `Email: ${clinic.email}` : null].filter(
      Boolean
    );
    if (contactParts.length > 0) {
      doc.text(contactParts.join('  |  '), { align: 'center' });
    }

    doc.moveDown(0.5);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .lineWidth(1)
      .strokeColor('#333333')
      .stroke();
    doc.moveDown(0.5);

    doc.fontSize(14).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown(0.75);

    // ---- Receipt / patient info ----
    const infoTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').text('Receipt No', doc.page.margins.left, infoTop);
    doc.font('Helvetica').text(payment.receiptNumber);
    doc.font('Helvetica-Bold').text('Date');
    doc
      .font('Helvetica')
      .text(payment.paidAt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }));
    doc.font('Helvetica-Bold').text('Invoice No');
    doc.font('Helvetica').text(invoice.invoiceNumber);

    const rightColumnX = doc.page.margins.left + pageWidth / 2;
    doc.fontSize(10).font('Helvetica-Bold').text('Patient', rightColumnX, infoTop);
    doc
      .font('Helvetica')
      .text(`${patient.firstName} ${patient.lastName}`, rightColumnX)
      .text(patient.patientCode, rightColumnX)
      .text(`Mobile: ${patient.mobileNumber}`, rightColumnX);

    doc.moveDown(1.5);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .lineWidth(0.5)
      .strokeColor('#999999')
      .stroke();
    doc.moveDown(0.75);

    // ---- Payment details ----
    doc.fontSize(10).font('Helvetica-Bold').text('Payment Details');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Amount Paid: Rs. ${Number(payment.amount).toFixed(2)}`);
    doc.text(`Payment Method: ${payment.method}`);
    if (payment.referenceNumber) {
      doc.text(`Reference No: ${payment.referenceNumber}`);
    }
    doc.text(`Collected By: ${payment.collectedBy.firstName} ${payment.collectedBy.lastName}`);
    if (payment.notes) {
      doc.text(`Notes: ${payment.notes}`);
    }

    doc.moveDown(0.75);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .lineWidth(0.5)
      .strokeColor('#999999')
      .stroke();
    doc.moveDown(0.75);

    // ---- Invoice balance summary ----
    doc.fontSize(10).font('Helvetica-Bold').text('Invoice Summary');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Invoice Total: Rs. ${totalAmount.toFixed(2)}`);
    doc.text(`Total Paid: Rs. ${paidAmount.toFixed(2)}`);
    doc.font('Helvetica-Bold').text(`Balance Remaining: Rs. ${balance.toFixed(2)}`);

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(8).text('This is a system-generated receipt.', { align: 'center' });

    doc.end();
  });
}

async function getPaymentReceipt(id: string, clinicId: string): Promise<{ buffer: Buffer; payment: PaymentWithInvoice }> {
  const payment = await getPayment(id, clinicId);

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) {
    throw ApiError.notFound('Clinic not found');
  }

  const buffer = await generateReceiptPdf({
    payment,
    patient: payment.invoice.patient,
    clinic,
  });

  return { buffer, payment };
}

export const paymentService = {
  recordPayment,
  listPaymentsForInvoice,
  getPayment,
  getPaymentReceipt,
};
