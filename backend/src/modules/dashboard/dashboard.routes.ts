import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getRecentActivity, getSummary, getTrends } from './dashboard.controller';
import { dashboardQuerySchema } from './dashboard.types';

const router = Router();

router.use(authenticate, authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'));

router.get('/summary', getSummary);
router.get('/trends', validate({ query: dashboardQuerySchema }), getTrends);
router.get('/recent-activity', getRecentActivity);

export const dashboardRoutes = router;
