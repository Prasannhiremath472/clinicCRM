import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { AppointmentCalendarPage } from "@/features/appointments/pages/AppointmentCalendarPage";
import { AppointmentDetailPage } from "@/features/appointments/pages/AppointmentDetailPage";
import { AppointmentNewPage } from "@/features/appointments/pages/AppointmentNewPage";
import { AppointmentsListPage } from "@/features/appointments/pages/AppointmentsListPage";
import { InvoiceDetailPage } from "@/features/billing/pages/InvoiceDetailPage";
import { InvoiceFormPage } from "@/features/billing/pages/InvoiceFormPage";
import { InvoicesListPage } from "@/features/billing/pages/InvoicesListPage";
import { ConsultationPage } from "@/features/consultations/pages/ConsultationPage";
import { DoctorFormPage } from "@/features/doctors/pages/DoctorFormPage";
import { DoctorProfilePage } from "@/features/doctors/pages/DoctorProfilePage";
import { DoctorsListPage } from "@/features/doctors/pages/DoctorsListPage";
import { FollowUpFormPage } from "@/features/followups/pages/FollowUpFormPage";
import { FollowUpsListPage } from "@/features/followups/pages/FollowUpsListPage";
import { PatientFormPage } from "@/features/patients/pages/PatientFormPage";
import { PatientProfilePage } from "@/features/patients/pages/PatientProfilePage";
import { PatientsListPage } from "@/features/patients/pages/PatientsListPage";
import { PrescriptionPage } from "@/features/prescriptions/pages/PrescriptionPage";
import { AppointmentReportPage } from "@/features/reports/pages/AppointmentReportPage";
import { DoctorPerformanceReportPage } from "@/features/reports/pages/DoctorPerformanceReportPage";
import { FollowUpReportPage } from "@/features/reports/pages/FollowUpReportPage";
import { PatientReportPage } from "@/features/reports/pages/PatientReportPage";
import { RevenueReportPage } from "@/features/reports/pages/RevenueReportPage";
import { ReportsHomePage } from "@/features/reports/pages/ReportsHomePage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleGuard } from "@/routes/RoleGuard";
import { RootRedirect } from "@/routes/RootRedirect";

const PATIENT_STAFF_ROLES = ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"] as const;
const DOCTOR_STAFF_ROLES = ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"] as const;
const APPOINTMENT_STAFF_ROLES = ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"] as const;
const BILLING_STAFF_ROLES = ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"] as const;
const FOLLOWUP_STAFF_ROLES = ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"] as const;
const REPORTS_GENERAL_STAFF_ROLES = ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST"] as const;
const REPORTS_FINANCIAL_STAFF_ROLES = ["CLINIC_ADMIN", "RECEPTIONIST"] as const;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/settings", element: <SettingsPage /> },
          {
            element: <RoleGuard allowedRoles={[...PATIENT_STAFF_ROLES]} />,
            children: [
              { path: "/patients", element: <PatientsListPage /> },
              { path: "/patients/new", element: <PatientFormPage /> },
              { path: "/patients/:id", element: <PatientProfilePage /> },
              { path: "/patients/:id/edit", element: <PatientFormPage /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={[...DOCTOR_STAFF_ROLES]} />,
            children: [
              { path: "/doctors", element: <DoctorsListPage /> },
              { path: "/doctors/new", element: <DoctorFormPage /> },
              { path: "/doctors/:id", element: <DoctorProfilePage /> },
              { path: "/doctors/:id/edit", element: <DoctorFormPage /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={[...APPOINTMENT_STAFF_ROLES]} />,
            children: [
              { path: "/appointments", element: <AppointmentsListPage /> },
              { path: "/appointments/calendar", element: <AppointmentCalendarPage /> },
              { path: "/appointments/new", element: <AppointmentNewPage /> },
              { path: "/appointments/:id", element: <AppointmentDetailPage /> },
              { path: "/consultations/:appointmentId", element: <ConsultationPage /> },
              { path: "/prescriptions/:consultationId", element: <PrescriptionPage /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={[...BILLING_STAFF_ROLES]} />,
            children: [
              { path: "/billing", element: <InvoicesListPage /> },
              { path: "/billing/new", element: <InvoiceFormPage /> },
              { path: "/billing/:id", element: <InvoiceDetailPage /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={[...FOLLOWUP_STAFF_ROLES]} />,
            children: [
              { path: "/follow-ups", element: <FollowUpsListPage /> },
              { path: "/follow-ups/new", element: <FollowUpFormPage /> },
              { path: "/follow-ups/:id/edit", element: <FollowUpFormPage /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={[...REPORTS_GENERAL_STAFF_ROLES]} />,
            children: [
              { path: "/reports", element: <ReportsHomePage /> },
              { path: "/reports/appointments", element: <AppointmentReportPage /> },
              { path: "/reports/patients", element: <PatientReportPage /> },
              { path: "/reports/follow-ups", element: <FollowUpReportPage /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={[...REPORTS_FINANCIAL_STAFF_ROLES]} />,
            children: [
              { path: "/reports/revenue", element: <RevenueReportPage /> },
              { path: "/reports/doctor-performance", element: <DoctorPerformanceReportPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "/403",
    element: <ForbiddenPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
