import { Doctor, DoctorLeave, DoctorSchedule, Prisma, Role, User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ListDoctorsQuery, ScheduleEntryInput } from './doctor.types';

const MAX_CODE_GENERATION_ATTEMPTS = 3;

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type SafeDoctorUser = Pick<
  User,
  'id' | 'email' | 'firstName' | 'lastName' | 'phone' | 'role' | 'isActive' | 'lastLoginAt' | 'createdAt'
>;

export type DoctorWithUser = Doctor & { user: SafeDoctorUser };
export type DoctorWithUserAndSchedules = DoctorWithUser & { schedules: DoctorSchedule[] };

export interface CreateDoctorWithUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  consultationFee: number;
}

export interface UpdateDoctorData {
  qualification?: string;
  specialization?: string;
  experienceYears?: number;
  consultationFee?: number;
  isActive?: boolean;
}

function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

function findById(id: string, clinicId: string): Promise<DoctorWithUserAndSchedules | null> {
  return prisma.doctor.findFirst({
    where: { id, clinicId },
    include: {
      user: { select: SAFE_USER_SELECT },
      schedules: { orderBy: { weekDay: 'asc' } },
    },
  });
}

function findByUserId(userId: string): Promise<DoctorWithUserAndSchedules | null> {
  return prisma.doctor.findFirst({
    where: { userId },
    include: {
      user: { select: SAFE_USER_SELECT },
      schedules: { orderBy: { weekDay: 'asc' } },
    },
  });
}

function buildListWhere(clinicId: string, filters: ListDoctorsQuery): Prisma.DoctorWhereInput {
  const where: Prisma.DoctorWhereInput = { clinicId };

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.specialization) {
    where.specialization = { contains: filters.specialization };
  }

  if (filters.search) {
    // MySQL's default collation (utf8mb4_general_ci/unicode_ci) is case-insensitive,
    // so `contains` here already performs a case-insensitive match without a `mode` option.
    where.OR = [
      { doctorCode: { contains: filters.search } },
      { specialization: { contains: filters.search } },
      { user: { firstName: { contains: filters.search } } },
      { user: { lastName: { contains: filters.search } } },
    ];
  }

  return where;
}

function buildOrderBy(filters: ListDoctorsQuery): Prisma.DoctorOrderByWithRelationInput {
  if (filters.sortBy === 'firstName') {
    return { user: { firstName: filters.sortOrder } };
  }
  return { [filters.sortBy]: filters.sortOrder };
}

async function list(
  clinicId: string,
  filters: ListDoctorsQuery
): Promise<{ items: DoctorWithUser[]; totalItems: number }> {
  const where = buildListWhere(clinicId, filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.doctor.findMany({
      where,
      include: { user: { select: SAFE_USER_SELECT } },
      orderBy: buildOrderBy(filters),
      skip,
      take: filters.pageSize,
    }),
    prisma.doctor.count({ where }),
  ]);

  return { items, totalItems };
}

async function getNextSequence(): Promise<number> {
  const count = await prisma.doctor.count();
  return count + 1;
}

function buildDoctorCode(sequence: number): string {
  return `DOC-${String(sequence).padStart(6, '0')}`;
}

async function createWithUser(
  clinicId: string,
  data: CreateDoctorWithUserData
): Promise<DoctorWithUser> {
  for (let attempt = 1; attempt <= MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const sequence = await getNextSequence();
    const doctorCode = buildDoctorCode(sequence);

    try {
      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            clinicId,
            email: data.email,
            passwordHash: data.passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            role: Role.DOCTOR,
          },
        });

        const doctor = await tx.doctor.create({
          data: {
            doctorCode,
            clinicId,
            userId: user.id,
            qualification: data.qualification,
            specialization: data.specialization,
            experienceYears: data.experienceYears,
            consultationFee: data.consultationFee,
          },
        });

        return { ...doctor, user: toSafeUserShape(user) };
      });
    } catch (error) {
      const isUniqueConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

      if (isUniqueConflict && attempt < MAX_CODE_GENERATION_ATTEMPTS) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate a unique doctor code after multiple attempts');
}

function toSafeUserShape(user: User): SafeDoctorUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

async function update(id: string, clinicId: string, data: UpdateDoctorData): Promise<DoctorWithUser | null> {
  const { count } = await prisma.doctor.updateMany({
    where: { id, clinicId },
    data,
  });

  if (count === 0) {
    return null;
  }

  return prisma.doctor.findUnique({
    where: { id },
    include: { user: { select: SAFE_USER_SELECT } },
  });
}

async function deactivate(id: string, clinicId: string): Promise<boolean> {
  const doctor = await prisma.doctor.findFirst({ where: { id, clinicId } });

  if (!doctor) {
    return false;
  }

  await prisma.$transaction([
    prisma.doctor.update({ where: { id }, data: { isActive: false } }),
    prisma.user.update({ where: { id: doctor.userId }, data: { isActive: false } }),
  ]);

  return true;
}

async function upsertSchedules(doctorId: string, schedules: ScheduleEntryInput[]): Promise<DoctorSchedule[]> {
  return prisma.$transaction(async (tx) => {
    await tx.doctorSchedule.deleteMany({ where: { doctorId } });

    if (schedules.length > 0) {
      await tx.doctorSchedule.createMany({
        data: schedules.map((schedule) => ({
          doctorId,
          weekDay: schedule.weekDay,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          slotDurationMinutes: schedule.slotDurationMinutes,
          isActive: schedule.isActive,
        })),
      });
    }

    return tx.doctorSchedule.findMany({ where: { doctorId }, orderBy: { weekDay: 'asc' } });
  });
}

function listSchedules(doctorId: string): Promise<DoctorSchedule[]> {
  return prisma.doctorSchedule.findMany({ where: { doctorId }, orderBy: { weekDay: 'asc' } });
}

function createLeave(doctorId: string, data: { date: Date; reason?: string | null }): Promise<DoctorLeave> {
  return prisma.doctorLeave.create({
    data: {
      doctorId,
      date: data.date,
      reason: data.reason ?? null,
    },
  });
}

function listLeaves(doctorId: string, fromDate?: Date, toDate?: Date): Promise<DoctorLeave[]> {
  const where: Prisma.DoctorLeaveWhereInput = { doctorId };

  if (fromDate || toDate) {
    where.date = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  return prisma.doctorLeave.findMany({ where, orderBy: { date: 'asc' } });
}

function findLeaveById(id: string, doctorId: string): Promise<DoctorLeave | null> {
  return prisma.doctorLeave.findFirst({ where: { id, doctorId } });
}

function deleteLeave(id: string): Promise<DoctorLeave> {
  return prisma.doctorLeave.delete({ where: { id } });
}

export const doctorRepository = {
  findUserByEmail,
  findById,
  findByUserId,
  list,
  createWithUser,
  update,
  deactivate,
  upsertSchedules,
  listSchedules,
  createLeave,
  listLeaves,
  findLeaveById,
  deleteLeave,
};

export type DoctorRepository = typeof doctorRepository;
