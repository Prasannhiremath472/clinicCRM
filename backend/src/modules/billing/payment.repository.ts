import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const MAX_CODE_GENERATION_ATTEMPTS = 3;

const SAFE_COLLECTED_BY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} satisfies Prisma.UserSelect;

const SAFE_PATIENT_SELECT = {
  id: true,
  patientCode: true,
  firstName: true,
  lastName: true,
  mobileNumber: true,
} satisfies Prisma.PatientSelect;

export type SafeCollectedBy = Prisma.UserGetPayload<{ select: typeof SAFE_COLLECTED_BY_SELECT }>;
export type SafePatient = Prisma.PatientGetPayload<{ select: typeof SAFE_PATIENT_SELECT }>;

export type PaymentWithInvoice = Payment & {
  collectedBy: SafeCollectedBy;
  invoice: Prisma.InvoiceGetPayload<true> & { patient: SafePatient };
};

const DETAIL_INCLUDE = {
  collectedBy: { select: SAFE_COLLECTED_BY_SELECT },
  invoice: { include: { patient: { select: SAFE_PATIENT_SELECT } } },
} satisfies Prisma.PaymentInclude;

function findById(id: string, clinicId: string): Promise<PaymentWithInvoice | null> {
  return prisma.payment.findFirst({
    where: { id, invoice: { clinicId } },
    include: DETAIL_INCLUDE,
  });
}

function listForInvoice(invoiceId: string, clinicId: string) {
  return prisma.payment.findMany({
    where: { invoiceId, invoice: { clinicId } },
    include: { collectedBy: { select: SAFE_COLLECTED_BY_SELECT } },
    orderBy: { paidAt: 'desc' },
  });
}

async function getNextSequenceForYear(year: number): Promise<number> {
  const count = await prisma.payment.count({
    where: { receiptNumber: { startsWith: `RCT-${year}-` } },
  });
  return count + 1;
}

function buildReceiptNumber(year: number, sequence: number): string {
  return `RCT-${year}-${String(sequence).padStart(6, '0')}`;
}

export interface CreatePaymentData {
  amount: number;
  method: Payment['method'];
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface RecordPaymentResult {
  payment: Payment;
  newPaidAmount: number;
  newStatus: PaymentStatus;
}

/**
 * Creates the Payment row and updates the parent Invoice's paidAmount/status in a single
 * transaction, with P2002 retry on the generated receiptNumber.
 */
async function create(
  invoiceId: string,
  currentPaidAmount: number,
  totalAmount: number,
  data: CreatePaymentData,
  collectedById: string
): Promise<RecordPaymentResult> {
  const year = new Date().getFullYear();

  for (let attempt = 1; attempt <= MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const sequence = await getNextSequenceForYear(year);
    const receiptNumber = buildReceiptNumber(year, sequence);

    const newPaidAmount = currentPaidAmount + data.amount;
    const newStatus: PaymentStatus =
      newPaidAmount <= 0
        ? PaymentStatus.PENDING
        : newPaidAmount >= totalAmount
          ? PaymentStatus.PAID
          : PaymentStatus.PARTIAL;

    try {
      const payment = await prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
          data: {
            receiptNumber,
            invoiceId,
            amount: data.amount,
            method: data.method,
            referenceNumber: data.referenceNumber ?? null,
            collectedById,
            notes: data.notes ?? null,
          },
        });

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
          },
        });

        return created;
      });

      return { payment, newPaidAmount, newStatus };
    } catch (error) {
      const isUniqueConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

      if (isUniqueConflict && attempt < MAX_CODE_GENERATION_ATTEMPTS) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate a unique receipt number after multiple attempts');
}

export const paymentRepository = {
  findById,
  listForInvoice,
  create,
};

export type PaymentRepository = typeof paymentRepository;
