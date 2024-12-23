import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getNotifications, markAsRead } from '../controllers/notification.controller';

const router = Router();

router.get('/', authenticate, getNotifications);
router.post('/:id/read', authenticate, markAsRead);

export default router; 