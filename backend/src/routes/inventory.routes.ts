import { Router, RequestHandler } from 'express';
import { 
  getDrugs, 
  createDrug, 
  getLowStock, 
  getExpiring, 
  restockDrug,
  getCategories,
  createCategory,
  getForms,
  createForm,
  deleteCategory,
  deleteForm
} from '../controllers/inventory.controller';
import { isAdmin } from '../middleware/auth';

const router = Router();

router.get('/drugs', getDrugs as RequestHandler);
router.post('/drugs', isAdmin as RequestHandler, createDrug as RequestHandler);
router.get('/low-stock', getLowStock as RequestHandler);
router.get('/expiring', getExpiring as RequestHandler);
router.post('/drugs/:id/restock', isAdmin as RequestHandler, restockDrug as RequestHandler);
router.get('/categories', getCategories as RequestHandler);
router.post('/categories', isAdmin as RequestHandler, createCategory as RequestHandler);
router.get('/forms', getForms as RequestHandler);
router.post('/forms', isAdmin as RequestHandler, createForm as RequestHandler);
router.delete('/categories/:id', isAdmin as RequestHandler, deleteCategory as RequestHandler);
router.delete('/forms/:id', isAdmin as RequestHandler, deleteForm as RequestHandler);

export const inventoryRouter = router; 