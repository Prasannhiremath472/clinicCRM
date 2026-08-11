import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import express from 'express';
import request from 'supertest';
import { AuditAction, Role } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  clinic: {
    create: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  passwordResetToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { errorHandler } from '../src/middleware/errorHandler';
import { notFoundHandler } from '../src/middleware/notFoundHandler';
import { authRoutes } from '../src/modules/auth/auth.routes';

function buildApp() {
  const app = express();
  app.use(express.json());
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());
  app.use('/api/v1/auth', authRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const SALT_ROUNDS = 4;
const NOW = Date.now();

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    clinicId: 'clinic-1',
    email: 'doctor@example.com',
    passwordHash: '',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: null,
    role: Role.CLINIC_ADMIN,
    isActive: true,
    lastLoginAt: null,
    passwordChangedAt: null,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  };
}

describe('Auth module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('registers a new clinic admin successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      const createdUser = makeUser({ email: 'newadmin@example.com' });

      prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
        const tx = {
          clinic: { create: vi.fn().mockResolvedValue({ id: 'clinic-1', name: 'New Clinic' }) },
          user: { create: vi.fn().mockResolvedValue(createdUser) },
        };
        return fn(tx);
      });
      prismaMock.refreshToken.create.mockResolvedValue({});
      prismaMock.auditLog.create.mockResolvedValue({});

      const app = buildApp();
      const res = await request(app).post('/api/v1/auth/register').send({
        clinicName: 'New Clinic',
        adminFirstName: 'New',
        adminLastName: 'Admin',
        email: 'newadmin@example.com',
        password: 'Passw0rd1',
        phone: '9999999999',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();
      expect(res.body.data.user.email).toBe('newadmin@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects registration when email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(makeUser());

      const app = buildApp();
      const res = await request(app).post('/api/v1/auth/register').send({
        clinicName: 'New Clinic',
        adminFirstName: 'New',
        adminLastName: 'Admin',
        email: 'doctor@example.com',
        password: 'Passw0rd1',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in successfully with correct credentials', async () => {
      const passwordHash = await bcrypt.hash('Passw0rd1', SALT_ROUNDS);
      const user = makeUser({ passwordHash });

      prismaMock.user.findUnique.mockResolvedValueOnce(user);
      prismaMock.refreshToken.create.mockResolvedValue({});
      prismaMock.auditLog.create.mockResolvedValue({});
      prismaMock.user.update.mockResolvedValue(user);

      const app = buildApp();
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'doctor@example.com',
        password: 'Passw0rd1',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe('doctor@example.com');
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.LOGIN }) })
      );
    });

    it('rejects login with wrong password using a generic message', async () => {
      const passwordHash = await bcrypt.hash('Passw0rd1', SALT_ROUNDS);
      const user = makeUser({ passwordHash });

      prismaMock.user.findUnique.mockResolvedValueOnce(user);
      prismaMock.auditLog.create.mockResolvedValue({});

      const app = buildApp();
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'doctor@example.com',
        password: 'WrongPassword1',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects login for nonexistent user with the same generic message', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      prismaMock.auditLog.create.mockResolvedValue({});

      const app = buildApp();
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@example.com',
        password: 'Passw0rd1',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('rotates the refresh token on a valid request', async () => {
      const user = makeUser();
      const existingTokenRow = {
        id: 'rt-1',
        userId: user.id,
        tokenHash: 'irrelevant-because-we-mock-hash-lookup',
        revokedAt: null,
        expiresAt: new Date(NOW + 1000 * 60 * 60 * 24),
      };

      prismaMock.refreshToken.findUnique.mockResolvedValueOnce(existingTokenRow);
      prismaMock.user.findUnique.mockResolvedValueOnce(user);
      prismaMock.refreshToken.create.mockResolvedValue({});
      prismaMock.refreshToken.update.mockResolvedValue({});

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', ['refreshToken=some-raw-refresh-token-value'])
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();
      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt-1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        })
      );
    });

    it('rejects an invalid refresh token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', ['refreshToken=bogus-token'])
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('changes the password when authenticated and current password is correct', async () => {
      const jwt = require('jsonwebtoken');
      const passwordHash = await bcrypt.hash('OldPassw0rd', SALT_ROUNDS);
      const user = makeUser({ passwordHash });

      const accessToken = jwt.sign(
        { sub: user.id, role: user.role, clinicId: user.clinicId, email: user.email },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      prismaMock.user.findUnique.mockResolvedValueOnce(user);
      prismaMock.user.update.mockResolvedValue({ ...user, passwordHash: 'new-hash' });
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.auditLog.create.mockResolvedValue({});

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'OldPassw0rd', newPassword: 'NewPassw0rd1' });

      expect(res.status).toBe(200);
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('rejects change-password without an access token', async () => {
      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .send({ currentPassword: 'OldPassw0rd', newPassword: 'NewPassw0rd1' });

      expect(res.status).toBe(401);
    });
  });

  describe('Forgot / reset password flow', () => {
    it('always returns success for forgot-password regardless of whether the email exists', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'unknown@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('sends a reset token and resets the password for an existing user', async () => {
      const user = makeUser();
      prismaMock.user.findUnique.mockResolvedValueOnce(user);
      prismaMock.passwordResetToken.create.mockResolvedValue({});

      const app = buildApp();
      const forgotRes = await request(app).post('/api/v1/auth/forgot-password').send({ email: user.email });
      expect(forgotRes.status).toBe(200);
      expect(prismaMock.passwordResetToken.create).toHaveBeenCalled();

      const resetTokenRow = {
        id: 'prt-1',
        userId: user.id,
        usedAt: null,
        expiresAt: new Date(NOW + 1000 * 60 * 60),
      };
      prismaMock.passwordResetToken.findFirst.mockResolvedValueOnce(resetTokenRow);
      prismaMock.user.update.mockResolvedValue({ ...user, passwordHash: 'new-hash' });
      prismaMock.passwordResetToken.update.mockResolvedValue({});
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.user.findUnique.mockResolvedValueOnce(user);
      prismaMock.auditLog.create.mockResolvedValue({});

      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'some-raw-reset-token', newPassword: 'BrandNewPass1' });

      expect(resetRes.status).toBe(200);
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('rejects reset-password with an invalid or expired token', async () => {
      prismaMock.passwordResetToken.findFirst.mockResolvedValueOnce(null);

      const app = buildApp();
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'bad-token', newPassword: 'BrandNewPass1' });

      expect(res.status).toBe(400);
    });
  });
});
