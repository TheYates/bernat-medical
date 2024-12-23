import { Router } from 'express';
import { getUsers, createUser } from '../controllers/user.controller';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, isAdmin, getUsers);
router.post('/', authenticate, isAdmin, createUser);

export default router;