import { Router, RequestHandler } from 'express';
import { getClinicSettings, updateClinicSettings } from '../controllers/settings.controller';
import { isAdmin } from '../middleware/auth';

const router = Router();

router.get('/clinic', getClinicSettings as RequestHandler);
router.put('/clinic', isAdmin as RequestHandler, updateClinicSettings as RequestHandler);

export const settingsRouter = router; 