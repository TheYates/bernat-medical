import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getNotifications, markAsRead } from '../controllers/notification.controller';
import {
  getCategories,
  createCategory,
  deleteCategory,
  getForms,
  restockDrug,
  approveRestock,
  getRestockHistory,
  getLowStock,
  getExpiring
} from '../controllers/inventory.controller';

const router = Router();

// Inventory routes
router.get('/inventory/categories', authenticate, getCategories);
router.post('/inventory/categories', authenticate, createCategory);
router.delete('/inventory/categories/:id', authenticate, deleteCategory);
router.get('/inventory/forms', authenticate, getForms);
router.post('/inventory/:id/restock', authenticate, restockDrug);
router.post('/inventory/restock/:id/approve', authenticate, approveRestock);
router.get('/inventory/restock/history', authenticate, getRestockHistory);
router.get('/inventory/low-stock', authenticate, getLowStock);
router.get('/inventory/expiring', authenticate, getExpiring);

// Notification routes
router.get('/notifications', authenticate, getNotifications);
router.post('/notifications/:id/read', authenticate, markAsRead);

export default router; 