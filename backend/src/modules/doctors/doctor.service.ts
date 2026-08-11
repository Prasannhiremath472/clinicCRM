import bcrypt from 'bcrypt';
import { DoctorLeave, DoctorSchedule, WeekDay } from '@prisma/client';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { buildPaginationMeta, PaginationMeta } from '../../utils/apiResponse';
import { doctorRepository, DoctorWithUser, DoctorWithUserAndSchedules } from './doctor.repository';
import {
  CreateDoctorInput,
  CreateLeaveInput,
  ListDoctorsQuery,
  ScheduleEntryInput,
  UpdateDoctorInput,
} from './doctor.types';

const WEEK_DAYS_BY_INDEX: WeekDay[] = [
  WeekDay.SUNDAY,
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
];

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

export interface AvailabilityResult {
  available: boolean;
  slots: AvailabilitySlot[];
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function toDateOnly(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Computes a doctor's theoretical open time slots for a given date, based purely on their
 * weekly schedule and any registered leave. This does NOT account for already-booked
 * appointments (the Appointments module does not exist yet); when that module is built it
 * should import this function and subtract booked slots from the result.
 */
function computeAvailableSlots(
  schedules: DoctorSchedule[],
  leaves: DoctorLeave[],
  date: Date
): AvailabilityResult {
  const targetDate = toDateOnly(date);
  const isOnLeave = leaves.some((leave) => toDateOnly(leave.date).getTime() === targetDate.getTime());

  if (isOnLeave) {
    return { available: false, slots: [] };
  }

  const weekDay = WEEK_DAYS_BY_INDEX[targetDate.getDay()];
  const schedule = schedules.find((s) => s.weekDay === weekDay && s.isActive);

  if (!schedule) {
    return { available: false, slots: [] };
  }

  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);
  const step = schedule.slotDurationMinutes;

  const slots: AvailabilitySlot[] = [];
  for (let slotStart = startMinutes; slotStart + step <= endMinutes; slotStart += step) {
    slots.push({
      startTime: minutesToTime(slotStart),
      endTime: minutesToTime(slotStart + step),
    });
  }

  return { available: slots.length > 0, slots };
}

async function createDoctor(clinicId: string, input: CreateDoctorInput): Promise<DoctorWithUser> {
  const existing = await doctorRepository.findUserByEmail(input.email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  return doctorRepository.createWithUser(clinicId, {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    passwordHash,
    qualification: input.qualification,
    specialization: input.specialization,
    experienceYears: input.experienceYears,
    consultationFee: input.consultationFee,
  });
}

async function getDoctor(id: string, clinicId: string): Promise<DoctorWithUserAndSchedules> {
  const doctor = await doctorRepository.findById(id, clinicId);

  if (!doctor) {
    throw ApiError.notFound('Doctor not found');
  }

  return doctor;
}

async function getMyDoctorProfile(userId: string): Promise<DoctorWithUserAndSchedules> {
  const doctor = await doctorRepository.findByUserId(userId);

  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  return doctor;
}

async function listDoctors(
  clinicId: string,
  query: ListDoctorsQuery
): Promise<{ items: DoctorWithUser[]; meta: PaginationMeta }> {
  const { items, totalItems } = await doctorRepository.list(clinicId, query);

  return {
    items,
    meta: buildPaginationMeta(query.page, query.pageSize, totalItems),
  };
}

async function updateDoctor(id: string, clinicId: string, input: UpdateDoctorInput): Promise<DoctorWithUser> {
  const updated = await doctorRepository.update(id, clinicId, input);

  if (!updated) {
    throw ApiError.notFound('Doctor not found');
  }

  return updated;
}

async function deactivateDoctor(id: string, clinicId: string): Promise<void> {
  const deactivated = await doctorRepository.deactivate(id, clinicId);

  if (!deactivated) {
    throw ApiError.notFound('Doctor not found');
  }
}

async function ensureDoctorBelongsToClinic(doctorId: string, clinicId: string): Promise<void> {
  const doctor = await doctorRepository.findById(doctorId, clinicId);

  if (!doctor) {
    throw ApiError.notFound('Doctor not found');
  }
}

async function setSchedule(
  doctorId: string,
  clinicId: string,
  schedules: ScheduleEntryInput[]
): Promise<DoctorSchedule[]> {
  await ensureDoctorBelongsToClinic(doctorId, clinicId);
  return doctorRepository.upsertSchedules(doctorId, schedules);
}

async function getSchedule(doctorId: string, clinicId: string): Promise<DoctorSchedule[]> {
  await ensureDoctorBelongsToClinic(doctorId, clinicId);
  return doctorRepository.listSchedules(doctorId);
}

async function getAvailability(
  doctorId: string,
  clinicId: string,
  date: string
): Promise<AvailabilityResult> {
  await ensureDoctorBelongsToClinic(doctorId, clinicId);

  const targetDate = new Date(date);
  const [schedules, leaves] = await Promise.all([
    doctorRepository.listSchedules(doctorId),
    doctorRepository.listLeaves(doctorId, toDateOnly(targetDate), toDateOnly(targetDate)),
  ]);

  return computeAvailableSlots(schedules, leaves, targetDate);
}

async function addLeave(doctorId: string, clinicId: string, input: CreateLeaveInput): Promise<DoctorLeave> {
  await ensureDoctorBelongsToClinic(doctorId, clinicId);
  return doctorRepository.createLeave(doctorId, {
    date: new Date(input.date),
    reason: input.reason ?? null,
  });
}

async function listLeaves(
  doctorId: string,
  clinicId: string,
  query: { fromDate?: string; toDate?: string }
): Promise<DoctorLeave[]> {
  await ensureDoctorBelongsToClinic(doctorId, clinicId);
  return doctorRepository.listLeaves(
    doctorId,
    query.fromDate ? new Date(query.fromDate) : undefined,
    query.toDate ? new Date(query.toDate) : undefined
  );
}

async function removeLeave(leaveId: string, doctorId: string, clinicId: string): Promise<void> {
  await ensureDoctorBelongsToClinic(doctorId, clinicId);

  const leave = await doctorRepository.findLeaveById(leaveId, doctorId);

  if (!leave) {
    throw ApiError.notFound('Leave not found');
  }

  await doctorRepository.deleteLeave(leaveId);
}

export const doctorService = {
  createDoctor,
  getDoctor,
  getMyDoctorProfile,
  listDoctors,
  updateDoctor,
  deactivateDoctor,
  setSchedule,
  getSchedule,
  getAvailability,
  addLeave,
  listLeaves,
  removeLeave,
  computeAvailableSlots,
};
