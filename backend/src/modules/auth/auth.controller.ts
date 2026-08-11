import { CookieOptions, Request, Response } from 'express';
import { env, isProduction } from '../../config/env';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { parseDurationToMs } from '../../utils/tokens';
import { authService } from './auth.service';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterClinicAdminInput,
  RequestMeta,
  ResetPasswordInput,
} from './auth.types';

const REFRESH_COOKIE_NAME = 'refreshToken';

function getRequestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
    path: '/',
  };
}

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
}

function getIncomingRefreshToken(req: Request): string | undefined {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }
  return (req.body as { refreshToken?: string } | undefined)?.refreshToken;
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as RegisterClinicAdminInput;
  const { user, tokens } = await authService.registerClinic(input, getRequestMeta(req));

  setRefreshCookie(res, tokens.refreshToken);

  sendSuccess(
    res,
    { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
    'Clinic registered successfully',
    201
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;
  const { user, tokens } = await authService.login(email, password, getRequestMeta(req));

  setRefreshCookie(res, tokens.refreshToken);

  sendSuccess(res, { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 'Login successful');
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingToken = getIncomingRefreshToken(req);

  if (!incomingToken) {
    throw ApiError.unauthorized('Refresh token missing');
  }

  const tokens = await authService.refreshTokens(incomingToken, getRequestMeta(req));

  setRefreshCookie(res, tokens.refreshToken);

  sendSuccess(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const incomingToken = getIncomingRefreshToken(req);

  await authService.logout(incomingToken);

  clearRefreshCookie(res);

  sendSuccess(res, null, 'Logged out successfully');
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ForgotPasswordInput;
  await authService.forgotPassword(input);

  sendSuccess(res, null, 'If an account with that email exists, a reset link has been sent');
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ResetPasswordInput;
  await authService.resetPassword(input);

  sendSuccess(res, null, 'Password reset successfully');
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ChangePasswordInput;
  const userId = req.user!.id;

  await authService.changePassword(userId, input);

  sendSuccess(res, null, 'Password changed successfully');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const profile = await authService.getProfile(userId);

  sendSuccess(res, profile, 'Profile fetched successfully');
});
