import { Router } from 'express';
import { 
  getServices, 
  createService, 
  updateService,
  deleteService,
  toggleServiceStatus 
} from '../controllers/service.controller';
import { isAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getServices);
router.post('/', isAdmin, createService);
router.put('/:id', isAdmin, updateService);
router.delete('/:id', isAdmin, deleteService);
router.patch('/:id/toggle-status', isAdmin, toggleServiceStatus);

export default router; 