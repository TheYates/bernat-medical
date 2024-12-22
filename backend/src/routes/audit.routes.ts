import { Router, RequestHandler } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { isAdmin } from '../middleware/auth';

const router = Router();

router.get('/', isAdmin as RequestHandler, getAuditLogs as RequestHandler);

export const auditRouter = router; 