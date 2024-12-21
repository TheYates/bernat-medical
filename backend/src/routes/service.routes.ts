import { Router, RequestHandler } from 'express';
import { 
  getServices, 
  createService, 
  updateService,
  deleteService,
  toggleServiceStatus 
} from '../controllers/service.controller';
import { isAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getServices as RequestHandler);
router.post('/', isAdmin as RequestHandler, createService as RequestHandler);
router.put('/:id', isAdmin as RequestHandler, updateService as RequestHandler);
router.delete('/:id', isAdmin as RequestHandler, deleteService as RequestHandler);
router.patch('/:id/toggle-status', isAdmin as RequestHandler, toggleServiceStatus as RequestHandler);

export const serviceRouter = router; 