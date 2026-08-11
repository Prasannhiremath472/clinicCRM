import { AuditAction, Prisma, Role, User } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface CreateClinicWithAdminInput {
  clinicName: string;
  adminFirstName: string;
  adminLastName: string;
  email: string;
  passwordHash: string;
  phone?: string;
}

export interface CreateAuditLogInput {
  clinicId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
}

function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

async function createClinicWithAdmin(input: CreateClinicWithAdminInput): Promise<User> {
  return prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({
      data: {
        name: input.clinicName,
      },
    });

    const user = await tx.user.create({
      data: {
        clinicId: clinic.id,
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.adminFirstName,
        lastName: input.adminLastName,
        phone: input.phone,
        role: Role.CLINIC_ADMIN,
      },
    });

    return user;
  });
}

function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  return prisma.refreshToken.create({ data });
}

function findRefreshTokenByHash(tokenHash: string) {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

function revokeRefreshToken(id: string, replacedByTokenHash?: string) {
  return prisma.refreshToken.update({
    where: { id },
    data: {
      revokedAt: new Date(),
      ...(replacedByTokenHash ? { replacedByTokenHash } : {}),
    },
  });
}

function revokeAllUserRefreshTokens(userId: string) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function createPasswordResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.passwordResetToken.create({ data });
}

function findValidPasswordResetTokenByHash(tokenHash: string) {
  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

function markPasswordResetTokenUsed(id: string) {
  return prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

function updateUserPassword(userId: string, passwordHash: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });
}

function updateLastLogin(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

function createAuditLog(input: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      clinicId: input.clinicId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      description: input.description ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export const authRepository = {
  findUserByEmail,
  findUserById,
  createClinicWithAdmin,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  createPasswordResetToken,
  findValidPasswordResetTokenByHash,
  markPasswordResetTokenUsed,
  updateUserPassword,
  updateLastLogin,
  createAuditLog,
};

export type AuthRepository = typeof authRepository;
export type { Prisma };
