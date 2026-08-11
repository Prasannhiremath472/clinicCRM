import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';
import { validate } from '../../middleware/validate';
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  me,
  refreshToken,
  register,
  resetPassword,
} from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerClinicAdminSchema,
  resetPasswordSchema,
} from './auth.types';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerClinicAdminSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/refresh-token', validate({ body: refreshTokenSchema }), refreshToken);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.post('/reset-password', validate({ body: resetPasswordSchema }), resetPassword);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), changePassword);
router.get('/me', authenticate, me);

export const authRoutes = router;
