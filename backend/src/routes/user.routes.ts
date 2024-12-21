import { Router, RequestHandler } from 'express';
import { register, login, getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { isAdmin } from '../middleware/auth';

const router = Router();

router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);
router.get('/', isAdmin as RequestHandler, getUsers as RequestHandler);
router.post('/', isAdmin as RequestHandler, createUser as RequestHandler);
router.put('/:id', isAdmin as RequestHandler, updateUser as RequestHandler);
router.delete('/:id', isAdmin as RequestHandler, deleteUser as RequestHandler);

export const userRouter = router;