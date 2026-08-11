import {
  PrismaClient,
  Role,
  Gender,
  BloodGroup,
  MaritalStatus,
  AppointmentType,
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
  FollowUpStatus,
  WeekDay,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Passw0rd!';
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10); // lower rounds for seed speed

// ── helpers ──────────────────────────────────────────────────────────────────
function dob(yearsAgo: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsAgo);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function dateOnly(d: Date): Date {
  return new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z');
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const hash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);

  // ── 1. Clinic ──────────────────────────────────────────────────────────────
  const clinic = await prisma.clinic.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      name: 'Sai Medicare Clinic',
      logoUrl: null,
      address: '42, MG Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560038',
      phone: '+918022334455',
      email: 'contact@saimedicare.in',
      gstNumber: '29AABCS1234A1Z5',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      appointmentDurationMinutes: 15,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Sai Medicare Clinic',
      address: '42, MG Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560038',
      phone: '+918022334455',
      email: 'contact@saimedicare.in',
      gstNumber: '29AABCS1234A1Z5',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      appointmentDurationMinutes: 15,
    },
  });

  // ── 2. Users ───────────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@cliniccrm.com' },
    update: { passwordHash: hash },
    create: { email: 'superadmin@cliniccrm.com', passwordHash: hash, firstName: 'Platform', lastName: 'Admin', role: Role.SUPER_ADMIN, clinicId: null },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@saimedicare.in' },
    update: { passwordHash: hash, clinicId: clinic.id },
    create: { email: 'admin@saimedicare.in', passwordHash: hash, firstName: 'Priya', lastName: 'Sharma', role: Role.CLINIC_ADMIN, clinicId: clinic.id, phone: '+919900112233' },
  });

  const doctorUser1 = await prisma.user.upsert({
    where: { email: 'dr.asha@saimedicare.in' },
    update: { passwordHash: hash, clinicId: clinic.id },
    create: { email: 'dr.asha@saimedicare.in', passwordHash: hash, firstName: 'Asha', lastName: 'Rao', role: Role.DOCTOR, clinicId: clinic.id, phone: '+919811223344' },
  });

  const doctorUser2 = await prisma.user.upsert({
    where: { email: 'dr.kumar@saimedicare.in' },
    update: { passwordHash: hash, clinicId: clinic.id },
    create: { email: 'dr.kumar@saimedicare.in', passwordHash: hash, firstName: 'Ravi', lastName: 'Kumar', role: Role.DOCTOR, clinicId: clinic.id, phone: '+919833445566' },
  });

  const receptionUser = await prisma.user.upsert({
    where: { email: 'front.desk@saimedicare.in' },
    update: { passwordHash: hash, clinicId: clinic.id },
    create: { email: 'front.desk@saimedicare.in', passwordHash: hash, firstName: 'Meena', lastName: 'Nair', role: Role.RECEPTIONIST, clinicId: clinic.id, phone: '+919855667788' },
  });

  // ── 3. Doctors + Schedules ─────────────────────────────────────────────────
  // Clean up old orphaned doctor records before upserting
  await prisma.doctor.deleteMany({ where: { clinicId: clinic.id, userId: { notIn: [doctorUser1.id, doctorUser2.id] } } });

  const doctor1 = await prisma.doctor.upsert({
    where: { userId: doctorUser1.id },
    update: { consultationFee: 600, doctorCode: 'DOC-000001' },
    create: {
      doctorCode: 'DOC-000001',
      clinicId: clinic.id,
      userId: doctorUser1.id,
      qualification: 'MBBS, MD (Internal Medicine)',
      specialization: 'General Physician',
      experienceYears: 10,
      consultationFee: 600,
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { userId: doctorUser2.id },
    update: { consultationFee: 800, doctorCode: 'DOC-000002' },
    create: {
      doctorCode: 'DOC-000002',
      clinicId: clinic.id,
      userId: doctorUser2.id,
      qualification: 'MBBS, MS (Orthopaedics)',
      specialization: 'Orthopaedic Surgeon',
      experienceYears: 14,
      consultationFee: 800,
    },
  });

  // Schedules for doctor1 (Mon–Sat, 09:00–17:00)
  const weekdays1: WeekDay[] = [WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY, WeekDay.THURSDAY, WeekDay.FRIDAY, WeekDay.SATURDAY];
  for (const weekDay of weekdays1) {
    await prisma.doctorSchedule.upsert({
      where: { doctorId_weekDay: { doctorId: doctor1.id, weekDay } },
      update: {},
      create: { doctorId: doctor1.id, weekDay, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 },
    });
  }

  // Schedules for doctor2 (Mon–Fri, 10:00–16:00)
  const weekdays2: WeekDay[] = [WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY, WeekDay.THURSDAY, WeekDay.FRIDAY];
  for (const weekDay of weekdays2) {
    await prisma.doctorSchedule.upsert({
      where: { doctorId_weekDay: { doctorId: doctor2.id, weekDay } },
      update: {},
      create: { doctorId: doctor2.id, weekDay, startTime: '10:00', endTime: '16:00', slotDurationMinutes: 15 },
    });
  }

  // ── 4. Patients ────────────────────────────────────────────────────────────
  const patientsData = [
    { code: 'PT-2026-000001', firstName: 'Arjun',    lastName: 'Mehta',     gender: Gender.MALE,   dob: dob(35), mobile: '9876543210', blood: BloodGroup.B_POSITIVE,  marital: MaritalStatus.MARRIED,  city: 'Bengaluru', allergies: 'Penicillin', diseases: 'Hypertension, Type 2 Diabetes', medications: 'Metformin 500mg, Amlodipine 5mg' },
    { code: 'PT-2026-000002', firstName: 'Sunita',   lastName: 'Patel',     gender: Gender.FEMALE, dob: dob(45), mobile: '9845001122', blood: BloodGroup.A_POSITIVE,  marital: MaritalStatus.MARRIED,  city: 'Bengaluru', allergies: '', diseases: 'Hypothyroidism', medications: 'Levothyroxine 50mcg' },
    { code: 'PT-2026-000003', firstName: 'Rohan',    lastName: 'Singh',     gender: Gender.MALE,   dob: dob(28), mobile: '9731002233', blood: BloodGroup.O_POSITIVE,  marital: MaritalStatus.SINGLE,   city: 'Mysuru',    allergies: 'Sulfa drugs', diseases: '', medications: '' },
    { code: 'PT-2026-000004', firstName: 'Kavitha',  lastName: 'Reddy',     gender: Gender.FEMALE, dob: dob(52), mobile: '9900334455', blood: BloodGroup.AB_POSITIVE, marital: MaritalStatus.MARRIED,  city: 'Bengaluru', allergies: '', diseases: 'Osteoarthritis, Hypertension', medications: 'Losartan 50mg, Paracetamol 500mg' },
    { code: 'PT-2026-000005', firstName: 'Deepak',   lastName: 'Nair',      gender: Gender.MALE,   dob: dob(41), mobile: '9880556677', blood: BloodGroup.A_NEGATIVE,  marital: MaritalStatus.MARRIED,  city: 'Bengaluru', allergies: 'Aspirin', diseases: 'Asthma', medications: 'Salbutamol inhaler' },
    { code: 'PT-2026-000006', firstName: 'Anjali',   lastName: 'Iyer',      gender: Gender.FEMALE, dob: dob(24), mobile: '7760112233', blood: BloodGroup.B_NEGATIVE,  marital: MaritalStatus.SINGLE,   city: 'Bengaluru', allergies: '', diseases: '', medications: '' },
    { code: 'PT-2026-000007', firstName: 'Suresh',   lastName: 'Krishnan',  gender: Gender.MALE,   dob: dob(60), mobile: '9741223344', blood: BloodGroup.O_NEGATIVE,  marital: MaritalStatus.MARRIED,  city: 'Tumkur',    allergies: '', diseases: 'Type 2 Diabetes, Chronic Kidney Disease', medications: 'Insulin, Furosemide' },
    { code: 'PT-2026-000008', firstName: 'Lakshmi',  lastName: 'Venkat',    gender: Gender.FEMALE, dob: dob(33), mobile: '9663445566', blood: BloodGroup.A_POSITIVE,  marital: MaritalStatus.MARRIED,  city: 'Bengaluru', allergies: 'Latex', diseases: '', medications: '' },
    { code: 'PT-2026-000009', firstName: 'Amit',     lastName: 'Joshi',     gender: Gender.MALE,   dob: dob(19), mobile: '8150556677', blood: BloodGroup.B_POSITIVE,  marital: MaritalStatus.SINGLE,   city: 'Bengaluru', allergies: '', diseases: '', medications: '' },
    { code: 'PT-2026-000010', firstName: 'Preethi',  lastName: 'Murthy',    gender: Gender.FEMALE, dob: dob(38), mobile: '9972667788', blood: BloodGroup.O_POSITIVE,  marital: MaritalStatus.DIVORCED, city: 'Bengaluru', allergies: 'Codeine', diseases: 'Migraine', medications: 'Sumatriptan 50mg' },
    { code: 'PT-2026-000011', firstName: 'Vikram',   lastName: 'Bhat',      gender: Gender.MALE,   dob: dob(47), mobile: '9845778899', blood: BloodGroup.AB_NEGATIVE, marital: MaritalStatus.MARRIED,  city: 'Mangaluru', allergies: '', diseases: 'Hypertension', medications: 'Telmisartan 40mg' },
    { code: 'PT-2026-000012', firstName: 'Nalini',   lastName: 'Srinivas',  gender: Gender.FEMALE, dob: dob(55), mobile: '9731889900', blood: BloodGroup.B_POSITIVE,  marital: MaritalStatus.MARRIED,  city: 'Bengaluru', allergies: '', diseases: 'Rheumatoid Arthritis, Anaemia', medications: 'Methotrexate 10mg, Ferrous Sulphate' },
  ];

  const patients: { id: string; code: string }[] = [];
  for (const p of patientsData) {
    const created = await prisma.patient.upsert({
      where: { patientCode: p.code },
      update: {},
      create: {
        patientCode: p.code,
        clinicId: clinic.id,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        dateOfBirth: p.dob,
        mobileNumber: p.mobile,
        bloodGroup: p.blood,
        maritalStatus: p.marital,
        city: p.city,
        state: 'Karnataka',
        country: 'India',
        allergies: p.allergies || null,
        existingDiseases: p.diseases || null,
        currentMedications: p.medications || null,
        emergencyContactName: `${p.firstName} Family`,
        emergencyContactRelation: 'Spouse',
        emergencyContactMobile: '9999000000',
      },
    });
    patients.push({ id: created.id, code: p.code });
  }

  // ── 5. Appointments + Consultations + Prescriptions + Invoices ─────────────
  // We'll build a set of past completed visits and a few upcoming ones.

  type ApptSeed = {
    patientIdx: number;
    doctorRef: typeof doctor1;
    doctorUserRef: typeof doctorUser1;
    daysOffset: number; // negative = past, positive = future
    timeStr: string;
    status: AppointmentStatus;
    type: AppointmentType;
    symptoms?: string;
    diagnosis?: string;
    clinicalNotes?: string;
    treatmentPlan?: string;
    height?: number; weight?: number; bp?: string; temp?: number; pulse?: number; spo2?: number;
    medicines?: { name: string; dosage: string; freq: string; duration: string; instructions?: string }[];
    invoiceItems?: { description: string; quantity: number; unitPrice: number }[];
    paidAmount?: number;
    paymentMethod?: PaymentMethod;
    followUpDays?: number;
  };

  const apptSeeds: ApptSeed[] = [
    // ── Completed past visits ─────────────────────────────────────────────────
    {
      patientIdx: 0, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: -20, timeStr: '09:15', status: AppointmentStatus.COMPLETED, type: AppointmentType.WALK_IN,
      symptoms: 'Persistent headache, dizziness, blurred vision',
      diagnosis: 'Hypertensive urgency — BP 170/100 mmHg',
      clinicalNotes: 'Patient presents with elevated BP. Started on Amlodipine. Advised low-salt diet.',
      treatmentPlan: 'Start Amlodipine 5mg OD. Review in 2 weeks. Daily BP monitoring at home.',
      height: 172, weight: 82, bp: '170/100', temp: 98.4, pulse: 88, spo2: 98,
      medicines: [
        { name: 'Amlodipine', dosage: '5mg', freq: '0-0-1', duration: '30 days', instructions: 'Take at night with water' },
        { name: 'Metoprolol', dosage: '25mg', freq: '1-0-1', duration: '30 days', instructions: 'Do not stop abruptly' },
      ],
      invoiceItems: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 600 }, { description: 'BP Monitoring', quantity: 1, unitPrice: 100 }],
      paidAmount: 700, paymentMethod: PaymentMethod.CASH,
      followUpDays: 14,
    },
    {
      patientIdx: 1, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: -18, timeStr: '10:00', status: AppointmentStatus.COMPLETED, type: AppointmentType.WALK_IN,
      symptoms: 'Fatigue, weight gain, cold intolerance',
      diagnosis: 'Hypothyroidism — TSH elevated at 8.5 mIU/L',
      clinicalNotes: 'Patient has been on Levothyroxine 50mcg for 6 months. TSH still elevated. Dose increased.',
      treatmentPlan: 'Increase Levothyroxine to 75mcg. Repeat TFT in 6 weeks.',
      height: 158, weight: 68, bp: '118/76', temp: 97.8, pulse: 64, spo2: 99,
      medicines: [
        { name: 'Levothyroxine', dosage: '75mcg', freq: '1-0-0', duration: '45 days', instructions: 'Take 30 minutes before breakfast on empty stomach' },
      ],
      invoiceItems: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 600 }, { description: 'Thyroid Function Test', quantity: 1, unitPrice: 350 }],
      paidAmount: 950, paymentMethod: PaymentMethod.UPI,
    },
    {
      patientIdx: 3, doctorRef: doctor2, doctorUserRef: doctorUser2,
      daysOffset: -15, timeStr: '10:30', status: AppointmentStatus.COMPLETED, type: AppointmentType.WALK_IN,
      symptoms: 'Right knee pain and swelling, difficulty walking, morning stiffness lasting > 30 min',
      diagnosis: 'Osteoarthritis right knee — Grade II (Kellgren-Lawrence)',
      clinicalNotes: 'X-ray shows joint space narrowing. Crepitus on examination. Pain score 7/10.',
      treatmentPlan: 'Physiotherapy 3x/week, knee strengthening exercises, avoid stairs. NSAIDs for pain relief.',
      height: 155, weight: 74, bp: '132/84', temp: 98.2, pulse: 76, spo2: 98,
      medicines: [
        { name: 'Diclofenac', dosage: '50mg', freq: '1-0-1', duration: '10 days', instructions: 'Take after food. Avoid on empty stomach.' },
        { name: 'Pantoprazole', dosage: '40mg', freq: '1-0-0', duration: '10 days', instructions: 'Take 30 minutes before breakfast' },
        { name: 'Calcium + Vitamin D3', dosage: '500mg + 250IU', freq: '0-0-1', duration: '90 days', instructions: 'Take after dinner' },
      ],
      invoiceItems: [{ description: 'Consultation Fee (Specialist)', quantity: 1, unitPrice: 800 }, { description: 'X-Ray Right Knee', quantity: 1, unitPrice: 400 }],
      paidAmount: 1200, paymentMethod: PaymentMethod.CARD,
      followUpDays: 21,
    },
    {
      patientIdx: 4, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: -12, timeStr: '11:00', status: AppointmentStatus.COMPLETED, type: AppointmentType.WALK_IN,
      symptoms: 'Wheezing, chest tightness, shortness of breath at rest',
      diagnosis: 'Acute exacerbation of bronchial asthma',
      clinicalNotes: 'SpO2 94% on presentation. Nebulisation given. Improved to 98% post treatment.',
      treatmentPlan: 'Nebulisation Salbutamol + Ipratropium stat. Add inhaled corticosteroid. Avoid triggers.',
      height: 168, weight: 71, bp: '124/80', temp: 99.1, pulse: 102, spo2: 94,
      medicines: [
        { name: 'Salbutamol Inhaler', dosage: '100mcg', freq: '1 puff as needed', duration: '30 days', instructions: 'Use spacer. Max 4 puffs per day.' },
        { name: 'Budesonide Inhaler', dosage: '200mcg', freq: '1-0-1', duration: '30 days', instructions: 'Rinse mouth after use' },
        { name: 'Montelukast', dosage: '10mg', freq: '0-0-1', duration: '30 days', instructions: 'Take at night' },
      ],
      invoiceItems: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 600 }, { description: 'Nebulisation', quantity: 1, unitPrice: 200 }, { description: 'SpO2 Monitoring', quantity: 1, unitPrice: 50 }],
      paidAmount: 500, paymentMethod: PaymentMethod.CASH, // partial payment
    },
    {
      patientIdx: 6, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: -10, timeStr: '09:00', status: AppointmentStatus.COMPLETED, type: AppointmentType.WALK_IN,
      symptoms: 'Swelling of feet, decreased urine output, fatigue',
      diagnosis: 'Chronic Kidney Disease — Stage 3 with fluid overload',
      clinicalNotes: 'Creatinine 2.4 mg/dL, eGFR 28. Started Furosemide. Dietary counselling given.',
      treatmentPlan: 'Furosemide 40mg OD. Protein-restricted diet. Fluid restriction 1.5L/day. Monthly labs.',
      height: 165, weight: 78, bp: '148/92', temp: 98.6, pulse: 80, spo2: 97,
      medicines: [
        { name: 'Furosemide', dosage: '40mg', freq: '1-0-0', duration: '30 days', instructions: 'Take in the morning. Monitor weight daily.' },
        { name: 'Insulin (Regular)', dosage: 'As per sliding scale', freq: '1-1-1', duration: '30 days', instructions: 'Before meals as advised' },
        { name: 'Erythropoietin', dosage: '4000IU', freq: 'Twice weekly', duration: '30 days', instructions: 'Subcutaneous injection' },
      ],
      invoiceItems: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 600 }, { description: 'Renal Function Test', quantity: 1, unitPrice: 450 }, { description: 'CBC', quantity: 1, unitPrice: 250 }],
      paidAmount: 1300, paymentMethod: PaymentMethod.UPI,
      followUpDays: 7,
    },
    {
      patientIdx: 9, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: -8, timeStr: '14:00', status: AppointmentStatus.COMPLETED, type: AppointmentType.ONLINE,
      symptoms: 'Severe right-sided headache, photophobia, nausea, vomiting',
      diagnosis: 'Migraine with aura — moderate severity',
      clinicalNotes: 'Typical migraine pattern. Sumatriptan dose reviewed. Lifestyle triggers discussed.',
      treatmentPlan: 'Sumatriptan 50mg at onset. Naproxen 500mg for breakthrough pain. Migraine diary.',
      height: 162, weight: 60, bp: '116/74', temp: 98.2, pulse: 72, spo2: 99,
      medicines: [
        { name: 'Sumatriptan', dosage: '50mg', freq: 'As needed at onset', duration: '30 days', instructions: 'Take as soon as headache starts. Do not exceed 2 tablets in 24 hours.' },
        { name: 'Naproxen', dosage: '500mg', freq: 'As needed', duration: '10 days', instructions: 'Take after food for breakthrough pain' },
        { name: 'Propranolol', dosage: '20mg', freq: '1-0-1', duration: '30 days', instructions: 'Preventive therapy. Do not stop abruptly.' },
      ],
      invoiceItems: [{ description: 'Online Consultation Fee', quantity: 1, unitPrice: 500 }],
      paidAmount: 500, paymentMethod: PaymentMethod.UPI,
    },
    {
      patientIdx: 11, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: -6, timeStr: '10:30', status: AppointmentStatus.COMPLETED, type: AppointmentType.WALK_IN,
      symptoms: 'Joint pain hands and wrists, morning stiffness > 1 hour, fatigue',
      diagnosis: 'Rheumatoid Arthritis — moderate activity (DAS28 score 4.2)',
      clinicalNotes: 'RF positive. Anti-CCP elevated. ESR 68. Started on Methotrexate. Liver function baseline normal.',
      treatmentPlan: 'Methotrexate 10mg once weekly with folic acid. NSAIDs for pain. Review in 4 weeks with LFT.',
      height: 156, weight: 63, bp: '120/78', temp: 98.4, pulse: 78, spo2: 99,
      medicines: [
        { name: 'Methotrexate', dosage: '10mg', freq: 'Once weekly (Saturday)', duration: '30 days', instructions: 'Take with food. Avoid alcohol. Use contraception.' },
        { name: 'Folic Acid', dosage: '5mg', freq: '1-0-0 (except Saturday)', duration: '30 days', instructions: 'Take daily except on Methotrexate day' },
        { name: 'Hydroxychloroquine', dosage: '200mg', freq: '0-0-1', duration: '30 days', instructions: 'Take after dinner' },
      ],
      invoiceItems: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 600 }, { description: 'RA Panel (RF, Anti-CCP, ESR, CRP)', quantity: 1, unitPrice: 800 }],
      paidAmount: 1400, paymentMethod: PaymentMethod.BANK_TRANSFER,
      followUpDays: 28,
    },
    {
      patientIdx: 2, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: -5, timeStr: '11:15', status: AppointmentStatus.COMPLETED, type: AppointmentType.WALK_IN,
      symptoms: 'Sore throat, fever 101°F, body aches, runny nose for 3 days',
      diagnosis: 'Acute viral pharyngitis / URTI',
      clinicalNotes: 'Throat congested. No bacterial exudate. Advised rest and hydration.',
      treatmentPlan: 'Symptomatic treatment. Rest, fluids, steam inhalation. Return if fever persists > 3 days.',
      height: 178, weight: 75, bp: '118/76', temp: 101.2, pulse: 96, spo2: 98,
      medicines: [
        { name: 'Paracetamol', dosage: '650mg', freq: '1-1-1', duration: '5 days', instructions: 'For fever and pain. Take after food.' },
        { name: 'Cetirizine', dosage: '10mg', freq: '0-0-1', duration: '5 days', instructions: 'For runny nose. May cause drowsiness.' },
        { name: 'Steam Inhalation', dosage: '—', freq: '2-3 times daily', duration: '5 days', instructions: 'Add Eucalyptus oil. Inhale for 10 minutes.' },
      ],
      invoiceItems: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 600 }],
      paidAmount: 600, paymentMethod: PaymentMethod.CASH,
    },
    {
      patientIdx: 7, doctorRef: doctor2, doctorUserRef: doctorUser2,
      daysOffset: -3, timeStr: '10:00', status: AppointmentStatus.COMPLETED, type: AppointmentType.WALK_IN,
      symptoms: 'Low back pain radiating to left leg, numbness in toes, pain score 8/10',
      diagnosis: 'Lumbar disc herniation L4-L5 with left-sided sciatica',
      clinicalNotes: 'MRI confirms L4-L5 disc prolapse. Straight leg raise positive at 45°. Conservative management advised.',
      treatmentPlan: 'Bed rest 2-3 days. NSAIDs + muscle relaxant. Physiotherapy after acute phase. Review with MRI.',
      height: 163, weight: 58, bp: '112/72', temp: 98.4, pulse: 74, spo2: 99,
      medicines: [
        { name: 'Etoricoxib', dosage: '90mg', freq: '1-0-0', duration: '7 days', instructions: 'Take after breakfast' },
        { name: 'Thiocolchicoside', dosage: '4mg', freq: '1-0-1', duration: '7 days', instructions: 'Muscle relaxant. Avoid driving.' },
        { name: 'Methylcobalamin', dosage: '500mcg', freq: '1-0-1', duration: '30 days', instructions: 'For nerve repair' },
      ],
      invoiceItems: [{ description: 'Consultation Fee (Specialist)', quantity: 1, unitPrice: 800 }, { description: 'MRI Review Charges', quantity: 1, unitPrice: 200 }],
      paidAmount: 1000, paymentMethod: PaymentMethod.UPI,
      followUpDays: 14,
    },
    // ── Today's appointments (mixed statuses) ──────────────────────────────────
    {
      patientIdx: 5, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: 0, timeStr: '09:00', status: AppointmentStatus.COMPLETED, type: AppointmentType.WALK_IN,
      symptoms: 'Annual health check-up',
      diagnosis: 'Healthy — no acute issues found',
      clinicalNotes: 'BMI 22.1. BP normal. Blood glucose fasting 94 mg/dL. All vitals within normal limits.',
      treatmentPlan: 'Continue healthy lifestyle. Repeat check-up in 12 months.',
      height: 161, weight: 57, bp: '110/70', temp: 98.2, pulse: 68, spo2: 99,
      medicines: [],
      invoiceItems: [{ description: 'Consultation Fee', quantity: 1, unitPrice: 600 }, { description: 'Comprehensive Health Check Package', quantity: 1, unitPrice: 1200 }],
      paidAmount: 1800, paymentMethod: PaymentMethod.UPI,
    },
    {
      patientIdx: 8, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: 0, timeStr: '10:30', status: AppointmentStatus.IN_CONSULTATION, type: AppointmentType.WALK_IN,
    },
    {
      patientIdx: 10, doctorRef: doctor2, doctorUserRef: doctorUser2,
      daysOffset: 0, timeStr: '10:00', status: AppointmentStatus.WAITING, type: AppointmentType.WALK_IN,
    },
    // ── Upcoming appointments ──────────────────────────────────────────────────
    {
      patientIdx: 0, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: 1, timeStr: '09:15', status: AppointmentStatus.CONFIRMED, type: AppointmentType.WALK_IN,
    },
    {
      patientIdx: 3, doctorRef: doctor2, doctorUserRef: doctorUser2,
      daysOffset: 2, timeStr: '10:30', status: AppointmentStatus.SCHEDULED, type: AppointmentType.WALK_IN,
    },
    {
      patientIdx: 6, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: 3, timeStr: '09:00', status: AppointmentStatus.SCHEDULED, type: AppointmentType.WALK_IN,
    },
    {
      patientIdx: 1, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: 5, timeStr: '11:00', status: AppointmentStatus.ONLINE, type: AppointmentType.ONLINE,
    },
    {
      patientIdx: 4, doctorRef: doctor1, doctorUserRef: doctorUser1,
      daysOffset: 7, timeStr: '14:00', status: AppointmentStatus.SCHEDULED, type: AppointmentType.WALK_IN,
    },
  ] as ApptSeed[];

  let apptCodeSeq = 1;
  const createdAppointments: { id: string; seed: ApptSeed; patientId: string }[] = [];

  for (const seed of apptSeeds) {
    const patientId = patients[seed.patientIdx].id;
    const apptDate = dateOnly(daysOffset(seed.daysOffset));
    const [startH, startM] = seed.timeStr.split(':').map(Number);
    const endH = Math.floor((startH * 60 + startM + 15) / 60);
    const endM = (startM + 15) % 60;
    const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
    const code = `APT-2026-${String(apptCodeSeq++).padStart(6,'0')}`;

    const existing = await prisma.appointment.findUnique({ where: { appointmentCode: code } });
    if (existing) {
      createdAppointments.push({ id: existing.id, seed, patientId });
      continue;
    }

    const appt = await prisma.appointment.create({
      data: {
        appointmentCode: code,
        clinicId: clinic.id,
        patientId,
        doctorId: seed.doctorRef.id,
        appointmentDate: apptDate,
        startTime: seed.timeStr,
        endTime,
        type: seed.type,
        status: seed.status,
        createdById: adminUser.id,
      },
    });
    createdAppointments.push({ id: appt.id, seed, patientId });
  }

  // ── Consultations for completed appointments ──────────────────────────────
  let rxCodeSeq = 1;
  let invCodeSeq = 1;
  let payCodeSeq = 1;

  for (const { id: apptId, seed, patientId } of createdAppointments) {
    if (seed.status !== AppointmentStatus.COMPLETED) continue;
    if (!seed.symptoms) continue;

    const existingConsult = await prisma.consultation.findUnique({ where: { appointmentId: apptId } });
    let consultId = existingConsult?.id;

    if (!existingConsult) {
      const consult = await prisma.consultation.create({
        data: {
          appointmentId: apptId,
          patientId,
          doctorId: seed.doctorRef.id,
          doctorUserId: seed.doctorUserRef.id,
          heightCm: seed.height ?? null,
          weightKg: seed.weight ?? null,
          bloodPressure: seed.bp ?? null,
          temperatureF: seed.temp ?? null,
          pulseRate: seed.pulse ?? null,
          oxygenSaturation: seed.spo2 ?? null,
          symptoms: seed.symptoms ?? null,
          diagnosis: seed.diagnosis ?? null,
          clinicalNotes: seed.clinicalNotes ?? null,
          treatmentPlan: seed.treatmentPlan ?? null,
        },
      });
      consultId = consult.id;
    }

    // ── Prescription ───────────────────────────────────────────────────────────
    if (seed.medicines && seed.medicines.length > 0 && consultId) {
      const rxCode = `RX-2026-${String(rxCodeSeq++).padStart(6,'0')}`;
      const existingRx = await prisma.prescription.findUnique({ where: { consultationId: consultId } });
      if (!existingRx) {
        const rx = await prisma.prescription.create({
          data: {
            prescriptionCode: rxCode,
            consultationId: consultId,
            patientId,
            doctorId: seed.doctorRef.id,
            issuedDate: daysAgo(Math.abs(seed.daysOffset)),
            notes: 'Follow up as advised. Come back if symptoms worsen.',
            items: {
              create: seed.medicines.map((m, i) => ({
                medicineName: m.name,
                dosage: m.dosage,
                frequency: m.freq,
                duration: m.duration,
                instructions: m.instructions ?? null,
                sortOrder: i,
              })),
            },
          },
        });
      }
    }

    // ── Invoice + Payment ─────────────────────────────────────────────────────
    if (seed.invoiceItems && seed.invoiceItems.length > 0) {
      const existingInv = await prisma.invoice.findUnique({ where: { appointmentId: apptId } });
      if (!existingInv) {
        const subtotal = seed.invoiceItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const totalAmount = subtotal;
        const paidAmt = seed.paidAmount ?? 0;
        const invStatus: PaymentStatus = paidAmt >= totalAmount ? PaymentStatus.PAID : paidAmt > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING;
        const invNum = `INV-2026-${String(invCodeSeq++).padStart(6,'0')}`;

        const inv = await prisma.invoice.create({
          data: {
            invoiceNumber: invNum,
            clinicId: clinic.id,
            patientId,
            appointmentId: apptId,
            subtotal,
            discount: 0,
            tax: 0,
            totalAmount,
            paidAmount: paidAmt,
            status: invStatus,
            createdById: receptionUser.id,
            items: {
              create: seed.invoiceItems.map(i => ({
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                amount: i.quantity * i.unitPrice,
              })),
            },
          },
        });

        if (paidAmt > 0) {
          const rctNum = `RCT-2026-${String(payCodeSeq++).padStart(6,'0')}`;
          await prisma.payment.create({
            data: {
              receiptNumber: rctNum,
              invoiceId: inv.id,
              amount: paidAmt,
              method: seed.paymentMethod ?? PaymentMethod.CASH,
              collectedById: receptionUser.id,
              paidAt: daysAgo(Math.abs(seed.daysOffset)),
            },
          });
        }
      }
    }

    // ── Follow-up ─────────────────────────────────────────────────────────────
    if (seed.followUpDays) {
      const existingFu = await prisma.followUp.findFirst({ where: { appointmentId: apptId } });
      if (!existingFu) {
        const fuDate = dateOnly(daysFromNow(seed.followUpDays - Math.abs(seed.daysOffset)));
        const fuStatus = fuDate < new Date() ? FollowUpStatus.OVERDUE : FollowUpStatus.PENDING;
        await prisma.followUp.create({
          data: {
            clinicId: clinic.id,
            patientId,
            appointmentId: apptId,
            followUpDate: fuDate,
            reason: `Follow-up for: ${seed.diagnosis ?? 'previous visit'}`,
            status: fuStatus,
            createdById: adminUser.id,
          },
        });
      }
    }
  }

  // ── 6. Additional standalone follow-ups ────────────────────────────────────
  const extraFollowUps = [
    { patientIdx: 5, days: 10,  reason: 'Annual eye check-up reminder',       status: FollowUpStatus.PENDING },
    { patientIdx: 8, days: -2,  reason: 'Post-vaccination follow-up',          status: FollowUpStatus.OVERDUE },
    { patientIdx: 2, days: 3,   reason: 'Review throat culture report',        status: FollowUpStatus.PENDING },
    { patientIdx: 9, days: 20,  reason: 'Migraine diary review',               status: FollowUpStatus.PENDING },
    { patientIdx: 10, days: 5,  reason: 'BP control check post medication',    status: FollowUpStatus.PENDING },
  ];

  for (const fu of extraFollowUps) {
    const patientId = patients[fu.patientIdx].id;
    const existing = await prisma.followUp.findFirst({ where: { clinicId: clinic.id, patientId, reason: fu.reason } });
    if (!existing) {
      const fuDate = dateOnly(daysFromNow(fu.days));
      await prisma.followUp.create({
        data: {
          clinicId: clinic.id,
          patientId,
          followUpDate: fuDate,
          reason: fu.reason,
          status: fu.status,
          createdById: adminUser.id,
        },
      });
    }
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  const [pc, ac, cc, rc, ic, fc] = await Promise.all([
    prisma.patient.count(), prisma.appointment.count(), prisma.consultation.count(),
    prisma.prescription.count(), prisma.invoice.count(), prisma.followUp.count(),
  ]);

  console.log('\n✅ Demo seed complete — Sai Medicare Clinic\n');
  console.table([
    { role: 'SUPER_ADMIN',  email: 'superadmin@cliniccrm.com',    password: SEED_PASSWORD },
    { role: 'CLINIC_ADMIN', email: 'admin@saimedicare.in',         password: SEED_PASSWORD },
    { role: 'DOCTOR',       email: 'dr.asha@saimedicare.in',       password: SEED_PASSWORD },
    { role: 'DOCTOR',       email: 'dr.kumar@saimedicare.in',      password: SEED_PASSWORD },
    { role: 'RECEPTIONIST', email: 'front.desk@saimedicare.in',    password: SEED_PASSWORD },
  ]);
  console.log(`\n📊 Records created:`);
  console.log(`   Patients: ${pc} | Appointments: ${ac} | Consultations: ${cc}`);
  console.log(`   Prescriptions: ${rc} | Invoices: ${ic} | Follow-ups: ${fc}\n`);
}

// helper used above
function daysOffset(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
