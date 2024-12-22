import { Router } from 'express';
import { getClinicSettings, updateClinicSettings } from '../controllers/clinic.controller';
import { isAdmin } from '../middleware/auth';

const router = Router();

router.get('/settings', getClinicSettings as any);
router.put('/settings', isAdmin as any, updateClinicSettings as any);

export const clinicRouter = router; 