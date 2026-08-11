import { AppointmentStatus, Clinic } from '@prisma/client';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { prisma } from '../../lib/prisma';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { isCloudinaryConfigured, cloudinary } from '../../lib/cloudinary';
import { ApiError } from '../../utils/ApiError';
import { buildPaginationMeta, PaginationMeta } from '../../utils/apiResponse';
import { doctorRepository } from '../doctors/doctor.repository';
import {
  prescriptionRepository,
  PrescriptionWithDetails,
  SafeDoctor,
  SafePatient,
} from './prescription.repository';
import { ListPrescriptionsQuery, SavePrescriptionInput } from './prescription.types';

const ALLOWED_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.IN_CONSULTATION,
  AppointmentStatus.COMPLETED,
];

function uploadPdfToCloudinary(buffer: Buffer, prescriptionId: string): Promise<{ secure_url: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `clinic-crm/prescriptions/${prescriptionId}`,
        public_id: 'document',
        resource_type: 'image',
        format: 'pdf',
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({ secure_url: result.secure_url });
      }
    );
    uploadStream.end(buffer);
  });
}

function formatAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

interface PdfPrescriptionItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

async function generatePrescriptionPdf(params: {
  prescriptionCode: string;
  issuedDate: Date;
  notes: string | null;
  items: PdfPrescriptionItem[];
  patient: SafePatient;
  doctor: SafeDoctor;
  clinic: Clinic;
}): Promise<Buffer> {
  const { prescriptionCode, issuedDate, notes, items, patient, doctor, clinic } = params;

  const verificationUrl = `${env.FRONTEND_URL}/verify-prescription/${prescriptionCode}`;
  const qrBuffer = await QRCode.toBuffer(verificationUrl, { type: 'png', width: 150, margin: 1 });

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

    doc.fontSize(14).font('Helvetica-Bold').text('PRESCRIPTION', { align: 'center' });
    doc.moveDown(0.5);

    // ---- Doctor / patient info block ----
    const infoTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').text('Doctor', doc.page.margins.left, infoTop);
    doc
      .font('Helvetica')
      .text(`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`)
      .text(doctor.qualification)
      .text(doctor.specialization);

    const rightColumnX = doc.page.margins.left + pageWidth / 2;
    doc.fontSize(10).font('Helvetica-Bold').text('Patient', rightColumnX, infoTop);
    doc
      .font('Helvetica')
      .text(`${patient.firstName} ${patient.lastName}`, rightColumnX)
      .text(`${patient.patientCode}  |  ${formatAge(patient.dateOfBirth)} yrs  |  ${patient.gender}`, rightColumnX)
      .text(`Mobile: ${patient.mobileNumber}`, rightColumnX);

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(9).text(`Prescription No: ${prescriptionCode}`, doc.page.margins.left);
    doc.text(
      `Issued: ${issuedDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}`,
      doc.page.margins.left
    );

    doc.moveDown(0.5);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .lineWidth(0.5)
      .strokeColor('#999999')
      .stroke();
    doc.moveDown(0.75);

    // ---- Rx symbol + medicine table ----
    doc.fontSize(16).font('Helvetica-Bold').text('Rx', doc.page.margins.left);
    doc.moveDown(0.5);

    const columns = [
      { label: 'Medicine', width: 0.32 },
      { label: 'Dosage', width: 0.16 },
      { label: 'Frequency', width: 0.16 },
      { label: 'Duration', width: 0.14 },
      { label: 'Instructions', width: 0.22 },
    ];

    let columnX = doc.page.margins.left;
    const headerY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    for (const column of columns) {
      doc.text(column.label, columnX, headerY, { width: column.width * pageWidth });
      columnX += column.width * pageWidth;
    }

    doc.moveDown(0.3);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .lineWidth(0.5)
      .strokeColor('#333333')
      .stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(9);
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const rowY = doc.y;
      columnX = doc.page.margins.left;

      const cells = [
        `${i + 1}. ${item.medicineName}`,
        item.dosage,
        item.frequency,
        item.duration,
        item.instructions ?? '-',
      ];

      let maxHeight = 0;
      for (let c = 0; c < columns.length; c += 1) {
        const height = doc.heightOfString(cells[c], { width: columns[c].width * pageWidth });
        maxHeight = Math.max(maxHeight, height);
      }

      columnX = doc.page.margins.left;
      for (let c = 0; c < columns.length; c += 1) {
        doc.text(cells[c], columnX, rowY, { width: columns[c].width * pageWidth });
        columnX += columns[c].width * pageWidth;
      }

      doc.y = rowY + maxHeight + 8;
    }

    doc.moveDown(0.5);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .lineWidth(0.5)
      .strokeColor('#999999')
      .stroke();
    doc.moveDown(0.75);

    if (notes) {
      doc.fontSize(10).font('Helvetica-Bold').text('Doctor\'s Notes');
      doc.font('Helvetica').fontSize(9).text(notes, { width: pageWidth });
      doc.moveDown(0.75);
    }

    // ---- Footer: QR code + signature ----
    const footerY = Math.max(doc.y, doc.page.height - doc.page.margins.bottom - 130);
    doc.image(qrBuffer, doc.page.margins.left, footerY, { width: 80, height: 80 });
    doc
      .fontSize(7)
      .font('Helvetica')
      .text('Scan to verify', doc.page.margins.left, footerY + 82, { width: 80, align: 'center' });

    const signatureBlockX = doc.page.margins.left + pageWidth - 200;
    if (doctor.signatureUrl) {
      try {
        doc.image(doctor.signatureUrl, signatureBlockX, footerY, { width: 150, height: 60 });
      } catch (error) {
        logger.warn('Could not embed doctor signature image in prescription PDF', { error });
      }
    }
    doc
      .moveTo(signatureBlockX, footerY + 65)
      .lineTo(signatureBlockX + 150, footerY + 65)
      .lineWidth(0.5)
      .strokeColor('#333333')
      .stroke();
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`, signatureBlockX, footerY + 70, {
        width: 150,
        align: 'center',
      });
    doc.fontSize(8).text("Doctor's Signature", signatureBlockX, footerY + 84, { width: 150, align: 'center' });

    doc.end();
  });
}

async function tryGenerateAndUploadPdf(params: {
  prescriptionId: string;
  prescriptionCode: string;
  issuedDate: Date;
  notes: string | null;
  items: PdfPrescriptionItem[];
  patient: SafePatient;
  doctor: SafeDoctor;
  clinic: Clinic;
}): Promise<string | null> {
  if (!isCloudinaryConfigured) {
    return null;
  }

  try {
    const buffer = await generatePrescriptionPdf(params);
    const result = await uploadPdfToCloudinary(buffer, params.prescriptionId);
    return result.secure_url;
  } catch (error) {
    logger.error('Failed to generate or upload prescription PDF', {
      error,
      prescriptionId: params.prescriptionId,
    });
    return null;
  }
}

async function loadConsultationContext(consultationId: string, clinicId: string) {
  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, appointment: { clinicId } },
    include: { appointment: true },
  });

  if (!consultation) {
    throw ApiError.notFound('Consultation not found');
  }

  if (!ALLOWED_APPOINTMENT_STATUSES.includes(consultation.appointment.status)) {
    throw ApiError.badRequest(
      `Cannot save a prescription unless the appointment is in consultation or completed (current status: ${consultation.appointment.status})`
    );
  }

  return consultation;
}

async function savePrescription(
  consultationId: string,
  clinicId: string,
  doctorUserId: string,
  input: SavePrescriptionInput
): Promise<PrescriptionWithDetails> {
  const consultation = await loadConsultationContext(consultationId, clinicId);

  const doctor = await doctorRepository.findByUserId(doctorUserId);
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found for the current user');
  }

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) {
    throw ApiError.notFound('Clinic not found');
  }

  const patient = await prisma.patient.findUnique({
    where: { id: consultation.patientId },
    select: {
      id: true,
      patientCode: true,
      firstName: true,
      lastName: true,
      mobileNumber: true,
      gender: true,
      dateOfBirth: true,
    },
  });

  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }

  const existing = await prescriptionRepository.findByConsultationId(consultationId, clinicId);
  const isNew = !existing;
  const prescriptionCode = existing
    ? existing.prescriptionCode
    : await prescriptionRepository.generateUniquePrescriptionCode();
  const issuedDate = existing?.issuedDate ?? new Date();
  const qrCodeData = `${env.FRONTEND_URL}/verify-prescription/${prescriptionCode}`;

  // Persist the prescription + items first (without a PDF yet) so we have a stable
  // prescription id to upload the generated PDF under (folder is keyed by prescription id).
  const saved = await prescriptionRepository.upsertForConsultation({
    consultationId,
    patientId: consultation.patientId,
    doctorId: doctor.id,
    prescriptionCode,
    notes: input.notes ?? null,
    items: input.items,
    pdfUrl: existing?.pdfUrl ?? null,
    qrCodeData,
    isNew,
  });

  const doctorForPdf: SafeDoctor = {
    id: doctor.id,
    doctorCode: doctor.doctorCode,
    qualification: doctor.qualification,
    specialization: doctor.specialization,
    signatureUrl: doctor.signatureUrl,
    user: {
      id: doctor.user.id,
      firstName: doctor.user.firstName,
      lastName: doctor.user.lastName,
      email: doctor.user.email,
      phone: doctor.user.phone,
    },
  };

  const itemsForPdf: PdfPrescriptionItem[] = input.items.map((item) => ({
    medicineName: item.medicineName,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions ?? null,
  }));

  const pdfUrl = await tryGenerateAndUploadPdf({
    prescriptionId: saved.id,
    prescriptionCode,
    issuedDate,
    notes: input.notes ?? null,
    items: itemsForPdf,
    patient,
    doctor: doctorForPdf,
    clinic,
  });

  if (pdfUrl !== saved.pdfUrl) {
    await prescriptionRepository.updatePdfUrl(saved.id, pdfUrl);
    saved.pdfUrl = pdfUrl;
  }

  return saved;
}

async function getPrescription(id: string, clinicId: string): Promise<PrescriptionWithDetails> {
  const prescription = await prescriptionRepository.findById(id, clinicId);

  if (!prescription) {
    throw ApiError.notFound('Prescription not found');
  }

  return prescription;
}

async function getPrescriptionByConsultation(
  consultationId: string,
  clinicId: string
): Promise<PrescriptionWithDetails> {
  const prescription = await prescriptionRepository.findByConsultationId(consultationId, clinicId);

  if (!prescription) {
    throw ApiError.notFound('Prescription not found for this consultation');
  }

  return prescription;
}

async function listPrescriptions(
  clinicId: string,
  query: ListPrescriptionsQuery
): Promise<{ items: PrescriptionWithDetails[]; meta: PaginationMeta }> {
  const { items, totalItems } = await prescriptionRepository.list(clinicId, query);

  return {
    items,
    meta: buildPaginationMeta(query.page, query.pageSize, totalItems),
  };
}

async function getOrRegeneratePdf(id: string, clinicId: string): Promise<{ pdfUrl: string | null }> {
  const prescription = await prescriptionRepository.findById(id, clinicId);

  if (!prescription) {
    throw ApiError.notFound('Prescription not found');
  }

  if (prescription.pdfUrl || !isCloudinaryConfigured) {
    return { pdfUrl: prescription.pdfUrl };
  }

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) {
    throw ApiError.notFound('Clinic not found');
  }

  const itemsForPdf: PdfPrescriptionItem[] = prescription.items.map((item) => ({
    medicineName: item.medicineName,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions,
  }));

  const pdfUrl = await tryGenerateAndUploadPdf({
    prescriptionId: prescription.id,
    prescriptionCode: prescription.prescriptionCode,
    issuedDate: prescription.issuedDate,
    notes: prescription.notes,
    items: itemsForPdf,
    patient: prescription.patient,
    doctor: prescription.doctor,
    clinic,
  });

  if (pdfUrl) {
    await prescriptionRepository.updatePdfUrl(prescription.id, pdfUrl);
  }

  return { pdfUrl };
}

export const prescriptionService = {
  savePrescription,
  getPrescription,
  getPrescriptionByConsultation,
  listPrescriptions,
  getOrRegeneratePdf,
};
