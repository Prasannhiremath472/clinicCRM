import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { buildPaginationMeta, PaginationMeta } from '../../utils/apiResponse';
import { isValidStatusTransition } from '../appointments/appointment.service';
import { doctorRepository } from '../doctors/doctor.repository';
import {
  consultationRepository,
  ConsultationWithDetails,
} from './consultation.repository';
import { ListConsultationsQuery, UpdateConsultationInput } from './consultation.types';

const STARTABLE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.WAITING,
];

async function startConsultation(
  appointmentId: string,
  clinicId: string,
  doctorUserId: string
): Promise<ConsultationWithDetails> {
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, clinicId } });

  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  if (!STARTABLE_APPOINTMENT_STATUSES.includes(appointment.status)) {
    throw ApiError.badRequest(
      `Cannot start consultation: appointment status is ${appointment.status}`
    );
  }

  const existing = await prisma.consultation.findUnique({ where: { appointmentId } });

  if (existing) {
    throw ApiError.conflict('A consultation already exists for this appointment');
  }

  const doctor = await doctorRepository.findByUserId(doctorUserId);

  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found for the current user');
  }

  if (!isValidStatusTransition(appointment.status, AppointmentStatus.IN_CONSULTATION)) {
    throw ApiError.badRequest(
      `Cannot change status from ${appointment.status} to ${AppointmentStatus.IN_CONSULTATION}`
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const consultation = await tx.consultation.create({
      data: {
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        doctorUserId,
      },
    });

    await tx.appointment.updateMany({
      where: { id: appointmentId, clinicId },
      data: { status: AppointmentStatus.IN_CONSULTATION },
    });

    return consultation;
  });

  const result = await consultationRepository.findById(created.id, clinicId);

  if (!result) {
    throw ApiError.internal('Failed to load consultation after creation');
  }

  return result;
}

async function getConsultation(id: string, clinicId: string): Promise<ConsultationWithDetails> {
  const consultation = await consultationRepository.findById(id, clinicId);

  if (!consultation) {
    throw ApiError.notFound('Consultation not found');
  }

  return consultation;
}

async function getConsultationByAppointment(
  appointmentId: string,
  clinicId: string
): Promise<ConsultationWithDetails> {
  const consultation = await consultationRepository.findByAppointmentId(appointmentId, clinicId);

  if (!consultation) {
    throw ApiError.notFound('Consultation not found for this appointment');
  }

  return consultation;
}

async function listConsultations(
  clinicId: string,
  query: ListConsultationsQuery
): Promise<{ items: ConsultationWithDetails[]; meta: PaginationMeta }> {
  const { items, totalItems } = await consultationRepository.list(clinicId, query);

  return {
    items,
    meta: buildPaginationMeta(query.page, query.pageSize, totalItems),
  };
}

async function updateConsultation(
  id: string,
  clinicId: string,
  input: UpdateConsultationInput
): Promise<ConsultationWithDetails> {
  const existing = await consultationRepository.findById(id, clinicId);

  if (!existing) {
    throw ApiError.notFound('Consultation not found');
  }

  if (existing.appointment.status !== AppointmentStatus.IN_CONSULTATION) {
    throw ApiError.badRequest('Cannot edit a consultation unless the appointment is in consultation');
  }

  const updated = await consultationRepository.update(id, input);

  if (!updated) {
    throw ApiError.notFound('Consultation not found');
  }

  return updated;
}

async function completeConsultation(id: string, clinicId: string): Promise<ConsultationWithDetails> {
  const existing = await consultationRepository.findById(id, clinicId);

  if (!existing) {
    throw ApiError.notFound('Consultation not found');
  }

  if (existing.appointment.status !== AppointmentStatus.IN_CONSULTATION) {
    throw ApiError.badRequest('Cannot complete a consultation unless the appointment is in consultation');
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.updateMany({
      where: { id: existing.appointmentId, clinicId },
      data: { status: AppointmentStatus.COMPLETED },
    });
  });

  const result = await consultationRepository.findById(id, clinicId);

  if (!result) {
    throw ApiError.notFound('Consultation not found');
  }

  return result;
}

export const consultationService = {
  startConsultation,
  getConsultation,
  getConsultationByAppointment,
  listConsultations,
  updateConsultation,
  completeConsultation,
};
