import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuditAction, User } from '@prisma/client';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { generateRawToken, hashToken, parseDurationToMs } from '../../utils/tokens';
import { sendEmail } from '../notifications/notification.service';
import { authRepository } from './auth.repository';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  RegisterClinicAdminInput,
  RequestMeta,
  ResetPasswordInput,
} from './auth.types';

export interface SafeUser {
  id: string;
  clinicId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: User['role'];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    clinicId: user.clinicId,
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

function generateAccessToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      clinicId: user.clinicId,
      email: user.email,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

async function issueTokenPair(user: User, meta: RequestMeta): Promise<AuthTokens> {
  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRawToken();
  const refreshTokenExpiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshTokenExpiresAt,
    userAgent: meta.userAgent ?? null,
    ipAddress: meta.ipAddress ?? null,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    refreshTokenExpiresAt,
  };
}

async function registerClinic(
  input: RegisterClinicAdminInput,
  meta: RequestMeta
): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const existing = await authRepository.findUserByEmail(input.email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  const user = await authRepository.createClinicWithAdmin({
    clinicName: input.clinicName,
    adminFirstName: input.adminFirstName,
    adminLastName: input.adminLastName,
    email: input.email,
    passwordHash,
    phone: input.phone,
  });

  await authRepository.createAuditLog({
    clinicId: user.clinicId,
    userId: user.id,
    action: AuditAction.CREATE,
    entityType: 'Clinic',
    entityId: user.clinicId,
    description: `Clinic "${input.clinicName}" registered with admin ${user.email}`,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const tokens = await issueTokenPair(user, meta);

  return { user: toSafeUser(user), tokens };
}

async function login(
  email: string,
  password: string,
  meta: RequestMeta
): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const user = await authRepository.findUserByEmail(email);

  const invalidCredentialsError = ApiError.unauthorized('Invalid email or password');

  if (!user) {
    await authRepository.createAuditLog({
      action: AuditAction.LOGIN_FAILED,
      entityType: 'User',
      description: `Login attempt failed: no account for ${email}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw invalidCredentialsError;
  }

  if (!user.isActive) {
    await authRepository.createAuditLog({
      clinicId: user.clinicId,
      userId: user.id,
      action: AuditAction.LOGIN_FAILED,
      entityType: 'User',
      entityId: user.id,
      description: 'Login attempt failed: account inactive',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw invalidCredentialsError;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    await authRepository.createAuditLog({
      clinicId: user.clinicId,
      userId: user.id,
      action: AuditAction.LOGIN_FAILED,
      entityType: 'User',
      entityId: user.id,
      description: 'Login attempt failed: incorrect password',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw invalidCredentialsError;
  }

  const tokens = await issueTokenPair(user, meta);
  await authRepository.updateLastLogin(user.id);

  await authRepository.createAuditLog({
    clinicId: user.clinicId,
    userId: user.id,
    action: AuditAction.LOGIN,
    entityType: 'User',
    entityId: user.id,
    description: `User ${user.email} logged in`,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { user: toSafeUser(user), tokens };
}

async function refreshTokens(rawRefreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
  const tokenHash = hashToken(rawRefreshToken);
  const existingToken = await authRepository.findRefreshTokenByHash(tokenHash);

  if (!existingToken) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  if (existingToken.revokedAt || existingToken.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  const user = await authRepository.findUserById(existingToken.userId);

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const tokens = await issueTokenPair(user, meta);
  await authRepository.revokeRefreshToken(existingToken.id, hashToken(tokens.refreshToken));

  return tokens;
}

async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const existingToken = await authRepository.findRefreshTokenByHash(tokenHash);

  if (!existingToken || existingToken.revokedAt) {
    return;
  }

  await authRepository.revokeRefreshToken(existingToken.id);
}

async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await authRepository.findUserByEmail(input.email);

  if (user && user.isActive) {
    const rawToken = generateRawToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt,
    });

    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    await sendEmail(
      user.email,
      'Reset your Clinic CRM password',
      `<p>Hello ${user.firstName},</p><p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`
    );
  }
}

async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashToken(input.token);
  const resetToken = await authRepository.findValidPasswordResetTokenByHash(tokenHash);

  if (!resetToken) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);

  await authRepository.updateUserPassword(resetToken.userId, passwordHash);
  await authRepository.markPasswordResetTokenUsed(resetToken.id);
  await authRepository.revokeAllUserRefreshTokens(resetToken.userId);

  const user = await authRepository.findUserById(resetToken.userId);

  await authRepository.createAuditLog({
    clinicId: user?.clinicId,
    userId: resetToken.userId,
    action: AuditAction.PASSWORD_RESET,
    entityType: 'User',
    entityId: resetToken.userId,
    description: 'Password reset via forgot-password flow',
  });
}

async function changePassword(
  userId: string,
  input: ChangePasswordInput
): Promise<void> {
  const user = await authRepository.findUserById(userId);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const passwordMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);

  if (!passwordMatches) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);

  await authRepository.updateUserPassword(userId, passwordHash);
  await authRepository.revokeAllUserRefreshTokens(userId);

  await authRepository.createAuditLog({
    clinicId: user.clinicId,
    userId,
    action: AuditAction.PASSWORD_CHANGE,
    entityType: 'User',
    entityId: userId,
    description: 'User changed their own password',
  });
}

async function getProfile(userId: string): Promise<SafeUser> {
  const user = await authRepository.findUserById(userId);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return toSafeUser(user);
}

export const authService = {
  registerClinic,
  login,
  refreshTokens,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
};
