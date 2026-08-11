import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createFollowUp,
  getDashboard,
  getFollowUp,
  listFollowUps,
  updateFollowUp,
  updateFollowUpStatus,
} from './followup.controller';
import {
  createFollowUpSchema,
  followUpIdParamsSchema,
  listFollowUpsQuerySchema,
  updateFollowUpSchema,
  updateStatusSchema,
} from './followup.types';

const router = Router();

router.use(authenticate, authorize('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'));

router.get('/', validate({ query: listFollowUpsQuerySchema }), listFollowUps);
router.get('/dashboard', getDashboard);
router.post('/', validate({ body: createFollowUpSchema }), createFollowUp);

router.get('/:id', validate({ params: followUpIdParamsSchema }), getFollowUp);
router.patch(
  '/:id',
  validate({ params: followUpIdParamsSchema, body: updateFollowUpSchema }),
  updateFollowUp
);
router.patch(
  '/:id/status',
  validate({ params: followUpIdParamsSchema, body: updateStatusSchema }),
  updateFollowUpStatus
);

export const followUpRoutes = router;
