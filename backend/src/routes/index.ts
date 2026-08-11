import { Router } from 'express';
import { appointmentRoutes } from '../modules/appointments/appointment.routes';
import { authRoutes } from '../modules/auth/auth.routes';
import { invoiceRoutes } from '../modules/billing/invoice.routes';
import { paymentRoutes } from '../modules/billing/payment.routes';
import { consultationRoutes } from '../modules/consultations/consultation.routes';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { doctorRoutes } from '../modules/doctors/doctor.routes';
import { followUpRoutes } from '../modules/followups/followup.routes';
import { patientRoutes } from '../modules/patients/patient.routes';
import { prescriptionRoutes } from '../modules/prescriptions/prescription.routes';
import { reportRoutes } from '../modules/reports/report.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/consultations', consultationRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);

export const rootRouter = router;
