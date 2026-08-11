import { AppointmentStatus, WeekDay } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { buildPaginationMeta, PaginationMeta } from '../../utils/apiResponse';
import { doctorService } from '../doctors/doctor.service';
import { doctorRepository } from '../doctors/doctor.repository';
import { patientRepository } from '../patients/patient.repository';
import {
  appointmentRepository,
  AppointmentWithDetails,
} from './appointment.repository';
import {
  CancelAppointmentInput,
  CreateAppointmentInput,
  ListAppointmentsQuery,
  RescheduleAppointmentInput,
} from './appointment.types';

const WEEK_DAYS_BY_INDEX: WeekDay[] = [
  WeekDay.SUNDAY,
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
];

const DEFAULT_SLOT_DURATION_MINUTES = 15;

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

export interface AvailabilityResult {
  available: boolean;
  slots: AvailabilitySlot[];
}

/**
 * Forward-only status transition map. Each key lists the states that may be reached
 * from it. Terminal states (COMPLETED, CANCELLED, NO_SHOW) map to an empty array.
 */
export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.SCHEDULED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.WAITING,
    AppointmentStatus.IN_CONSULTATION,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.WAITING,
    AppointmentStatus.IN_CONSULTATION,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.WAITING]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.WAITING,
    AppointmentStatus.IN_CONSULTATION,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.IN_CONSULTATION]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

export function isValidStatusTransition(current: AppointmentStatus, next: AppointmentStatus): boolean {
  return APPOINTMENT_STATUS_TRANSITIONS[current].includes(next);
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

function slotsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Cross-references the doctor's theoretical schedule-based slots (from the doctors module)
 * against already-booked appointments for that doctor+date to compute TRUE available slots.
 */
async function getDoctorAvailability(
  doctorId: string,
  clinicId: string,
  date: string,
  excludeAppointmentId?: string
): Promise<AvailabilityResult> {
  const targetDate = new Date(date);
  const dateOnly = toDateOnly(targetDate);

  const [schedules, leaves] = await Promise.all([
    doctorRepository.listSchedules(doctorId),
    doctorRepository.listLeaves(doctorId, dateOnly, dateOnly),
  ]);

  const theoretical = doctorService.computeAvailableSlots(schedules, leaves, targetDate);

  if (!theoretical.available || theoretical.slots.length === 0) {
    return { available: false, slots: [] };
  }

  const booked = await appointmentRepository.listForDoctorAndDate(
    doctorId,
    clinicId,
    dateOnly,
    excludeAppointmentId
  );

  const bookedRanges = booked.map((appt) => ({
    start: timeToMinutes(appt.startTime),
    end: timeToMinutes(appt.endTime),
  }));

  const freeSlots = theoretical.slots.filter((slot) => {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    return !bookedRanges.some((booked) => slotsOverlap(slotStart, slotEnd, booked.start, booked.end));
  });

  return { available: freeSlots.length > 0, slots: freeSlots };
}

/**
 * Determines the appointment end time for a doctor+date+startTime, based on the doctor's
 * schedule slot duration for that weekday, falling back to the clinic's configured default,
 * falling back to 15 minutes.
 */
async function resolveEndTime(
  doctorId: string,
  clinicId: string,
  date: Date,
  startTime: string
): Promise<string> {
  const weekDay = WEEK_DAYS_BY_INDEX[toDateOnly(date).getDay()];
  const schedules = await doctorRepository.listSchedules(doctorId);
  const schedule = schedules.find((s) => s.weekDay === weekDay && s.isActive);

  let slotDurationMinutes = schedule?.slotDurationMinutes;

  if (!slotDurationMinutes) {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    slotDurationMinutes = clinic?.appointmentDurationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES;
  }

  const startMinutes = timeToMinutes(startTime);
  return minutesToTime(startMinutes + slotDurationMinutes);
}

async function ensurePatientBelongsToClinic(patientId: string, clinicId: string): Promise<void> {
  const patient = await patientRepository.findById(patientId, clinicId);
  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }
}

async function ensureDoctorIsBookable(doctorId: string, clinicId: string): Promise<void> {
  const doctor = await doctorRepository.findById(doctorId, clinicId);
  if (!doctor) {
    throw ApiError.notFound('Doctor not found');
  }
  if (!doctor.isActive) {
    throw ApiError.badRequest('This doctor is not currently active');
  }
}

async function createAppointment(
  clinicId: string,
  createdById: string,
  input: CreateAppointmentInput
): Promise<AppointmentWithDetails> {
  await ensurePatientBelongsToClinic(input.patientId, clinicId);
  await ensureDoctorIsBookable(input.doctorId, clinicId);

  const appointmentDate = new Date(input.appointmentDate);
  const endTime = await resolveEndTime(input.doctorId, clinicId, appointmentDate, input.startTime);

  const availability = await getDoctorAvailability(input.doctorId, clinicId, input.appointmentDate);
  const slotIsAvailable = availability.slots.some(
    (slot) => slot.startTime === input.startTime && slot.endTime === endTime
  );

  if (!slotIsAvailable) {
    throw ApiError.conflict('This time slot is no longer available');
  }

  return appointmentRepository.create(
    clinicId,
    {
      patientId: input.patientId,
      doctorId: input.doctorId,
      appointmentDate,
      startTime: input.startTime,
      endTime,
      type: input.type,
      notes: input.notes ?? null,
    },
    createdById
  );
}

async function getAppointment(id: string, clinicId: string): Promise<AppointmentWithDetails> {
  const appointment = await appointmentRepository.findById(id, clinicId);

  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  return appointment;
}

async function listAppointments(
  clinicId: string,
  query: ListAppointmentsQuery
): Promise<{ items: AppointmentWithDetails[]; meta: PaginationMeta }> {
  const { items, totalItems } = await appointmentRepository.list(clinicId, query);

  return {
    items,
    meta: buildPaginationMeta(query.page, query.pageSize, totalItems),
  };
}

async function rescheduleAppointment(
  id: string,
  clinicId: string,
  input: RescheduleAppointmentInput
): Promise<AppointmentWithDetails> {
  const existing = await appointmentRepository.findById(id, clinicId);

  if (!existing) {
    throw ApiError.notFound('Appointment not found');
  }

  if (
    existing.status === AppointmentStatus.COMPLETED ||
    existing.status === AppointmentStatus.CANCELLED ||
    existing.status === AppointmentStatus.NO_SHOW
  ) {
    throw ApiError.badRequest(`Cannot reschedule an appointment that is already ${existing.status}`);
  }

  const appointmentDate = new Date(input.appointmentDate);
  const endTime = await resolveEndTime(existing.doctorId, clinicId, appointmentDate, input.startTime);

  const availability = await getDoctorAvailability(existing.doctorId, clinicId, input.appointmentDate, id);
  const slotIsAvailable = availability.slots.some(
    (slot) => slot.startTime === input.startTime && slot.endTime === endTime
  );

  if (!slotIsAvailable) {
    throw ApiError.conflict('This time slot is no longer available');
  }

  const updated = await appointmentRepository.updateSlot(id, clinicId, {
    appointmentDate,
    startTime: input.startTime,
    endTime,
  });

  if (!updated) {
    throw ApiError.notFound('Appointment not found');
  }

  return updated;
}

async function cancelAppointment(
  id: string,
  clinicId: string,
  input: CancelAppointmentInput
): Promise<AppointmentWithDetails> {
  const existing = await appointmentRepository.findById(id, clinicId);

  if (!existing) {
    throw ApiError.notFound('Appointment not found');
  }

  if (existing.status === AppointmentStatus.COMPLETED) {
    throw ApiError.badRequest('Cannot cancel a completed appointment');
  }

  if (existing.status === AppointmentStatus.CANCELLED) {
    throw ApiError.badRequest('This appointment is already cancelled');
  }

  if (existing.status === AppointmentStatus.NO_SHOW) {
    throw ApiError.badRequest('Cannot cancel an appointment marked as no-show');
  }

  const updated = await appointmentRepository.updateStatus(
    id,
    clinicId,
    AppointmentStatus.CANCELLED,
    input.cancelReason ?? null
  );

  if (!updated) {
    throw ApiError.notFound('Appointment not found');
  }

  return updated;
}

async function updateAppointmentStatus(
  id: string,
  clinicId: string,
  newStatus: AppointmentStatus
): Promise<AppointmentWithDetails> {
  const existing = await appointmentRepository.findById(id, clinicId);

  if (!existing) {
    throw ApiError.notFound('Appointment not found');
  }

  if (!isValidStatusTransition(existing.status, newStatus)) {
    throw ApiError.badRequest(
      `Cannot change status from ${existing.status} to ${newStatus}`
    );
  }

  const updated = await appointmentRepository.updateStatus(id, clinicId, newStatus);

  if (!updated) {
    throw ApiError.notFound('Appointment not found');
  }

  return updated;
}

export const appointmentService = {
  getDoctorAvailability,
  createAppointment,
  getAppointment,
  listAppointments,
  rescheduleAppointment,
  cancelAppointment,
  updateAppointmentStatus,
};
