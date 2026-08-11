import { Invoice, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ListInvoicesQuery } from './invoice.types';

const MAX_CODE_GENERATION_ATTEMPTS = 3;

const SAFE_PATIENT_SELECT = {
  id: true,
  patientCode: true,
  firstName: true,
  lastName: true,
  mobileNumber: true,
} satisfies Prisma.PatientSelect;

const SAFE_CREATED_BY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} satisfies Prisma.UserSelect;

const SAFE_COLLECTED_BY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} satisfies Prisma.UserSelect;

export type SafePatient = Prisma.PatientGetPayload<{ select: typeof SAFE_PATIENT_SELECT }>;
export type SafeCreatedBy = Prisma.UserGetPayload<{ select: typeof SAFE_CREATED_BY_SELECT }>;
export type SafeCollectedBy = Prisma.UserGetPayload<{ select: typeof SAFE_COLLECTED_BY_SELECT }>;

export type PaymentWithCollectedBy = Prisma.PaymentGetPayload<true> & {
  collectedBy: SafeCollectedBy;
};

export type InvoiceWithDetails = Invoice & {
  patient: SafePatient;
  createdBy: SafeCreatedBy;
  items: Prisma.InvoiceItemGetPayload<true>[];
  payments: PaymentWithCollectedBy[];
};

const DETAIL_INCLUDE = {
  patient: { select: SAFE_PATIENT_SELECT },
  createdBy: { select: SAFE_CREATED_BY_SELECT },
  items: true,
  payments: {
    include: { collectedBy: { select: SAFE_COLLECTED_BY_SELECT } },
    orderBy: { paidAt: 'desc' },
  },
} satisfies Prisma.InvoiceInclude;

function findById(id: string, clinicId: string): Promise<InvoiceWithDetails | null> {
  return prisma.invoice.findFirst({
    where: { id, clinicId },
    include: DETAIL_INCLUDE,
  });
}

function buildListWhere(clinicId: string, filters: ListInvoicesQuery): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = { clinicId };

  if (filters.patientId) {
    where.patientId = filters.patientId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {
      ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
      ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
    };
  }

  return where;
}

async function list(
  clinicId: string,
  filters: ListInvoicesQuery
): Promise<{ items: InvoiceWithDetails[]; totalItems: number }> {
  const where = buildListWhere(clinicId, filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: DETAIL_INCLUDE,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      skip,
      take: filters.pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, totalItems };
}

async function getNextSequenceForYear(year: number): Promise<number> {
  const count = await prisma.invoice.count({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
  });
  return count + 1;
}

function buildInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(6, '0')}`;
}

export interface CreateInvoiceItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface CreateInvoiceData {
  patientId: string;
  appointmentId?: string | null;
  items: CreateInvoiceItemData[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
}

async function create(
  clinicId: string,
  data: CreateInvoiceData,
  createdById: string
): Promise<InvoiceWithDetails> {
  const year = new Date().getFullYear();

  for (let attempt = 1; attempt <= MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const sequence = await getNextSequenceForYear(year);
    const invoiceNumber = buildInvoiceNumber(year, sequence);

    try {
      const invoiceId = await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            clinicId,
            patientId: data.patientId,
            appointmentId: data.appointmentId ?? null,
            subtotal: data.subtotal,
            discount: data.discount,
            tax: data.tax,
            totalAmount: data.totalAmount,
            paidAmount: 0,
            status: PaymentStatus.PENDING,
            createdById,
          },
        });

        await tx.invoiceItem.createMany({
          data: data.items.map((item) => ({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        });

        return invoice.id;
      });

      const result = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: DETAIL_INCLUDE,
      });

      if (!result) {
        throw new Error('Failed to load invoice after creation');
      }

      return result;
    } catch (error) {
      const isUniqueConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

      if (isUniqueConflict && attempt < MAX_CODE_GENERATION_ATTEMPTS) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate a unique invoice number after multiple attempts');
}

export interface RevenueSummary {
  totalRevenue: number;
  totalInvoiced: number;
  totalOutstanding: number;
  paymentCount: number;
  invoiceCount: number;
}

async function getRevenueSummary(clinicId: string, fromDate: Date, toDate: Date): Promise<RevenueSummary> {
  const [paymentAgg, invoiceAgg] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        invoice: { clinicId },
        paidAt: { gte: fromDate, lte: toDate },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({
      where: {
        clinicId,
        createdAt: { gte: fromDate, lte: toDate },
      },
      _sum: { totalAmount: true, paidAmount: true },
      _count: { _all: true },
    }),
  ]);

  const totalInvoiced = invoiceAgg._sum.totalAmount ? Number(invoiceAgg._sum.totalAmount) : 0;
  const totalPaidOnInvoicedRange = invoiceAgg._sum.paidAmount ? Number(invoiceAgg._sum.paidAmount) : 0;

  return {
    totalRevenue: paymentAgg._sum.amount ? Number(paymentAgg._sum.amount) : 0,
    totalInvoiced,
    totalOutstanding: totalInvoiced - totalPaidOnInvoicedRange,
    paymentCount: paymentAgg._count._all,
    invoiceCount: invoiceAgg._count._all,
  };
}

function getOutstandingInvoices(clinicId: string): Promise<InvoiceWithDetails[]> {
  return prisma.invoice.findMany({
    where: {
      clinicId,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
    },
    include: DETAIL_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export const invoiceRepository = {
  findById,
  list,
  create,
  getRevenueSummary,
  getOutstandingInvoices,
};

export type InvoiceRepository = typeof invoiceRepository;
