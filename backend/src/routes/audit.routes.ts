import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, isAdmin, getAuditLogs);

export default router; 