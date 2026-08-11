import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getPaymentReceipt } from './payment.controller';
import { paymentIdParamsSchema } from './payment.types';

const router = Router();

router.use(authenticate, authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'));

router.get('/:id/receipt', validate({ params: paymentIdParamsSchema }), getPaymentReceipt);

export const paymentRoutes = router;
