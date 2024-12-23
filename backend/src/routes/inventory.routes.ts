import { Router } from 'express';
import {
  getDrugs,
  createDrug,
  updateDrug,
  getLowStock,
  getExpiring,
  restockDrug,
  getCategories,
  createCategory,
  deleteCategory,
  getForms,
  createForm,
  deleteForm,
  getVendors,
  createVendor,
  updateVendor,
  toggleVendorActive,
  getInventoryStats,
  getTransactions,
  restock,
  approveRestock,
  getPendingRestocks,
  getRestockHistory,
} from '../controllers/inventory.controller';
import { authenticate, isAdmin } from '../middleware/auth';
import {
  getInsuranceCompanies,
  createInsuranceCompany,
  updateInsuranceCompany,
  getDrugInsuranceMarkups
} from '../controllers/insurance.controller';

const router = Router();

// Stats route
router.get('/stats', authenticate, getInventoryStats);

// Drug routes - specific routes first
router.get('/drugs/low-stock', authenticate, getLowStock);
router.get('/drugs/expiring', authenticate, getExpiring);

// Drug routes - parameterized routes after
router.get('/drugs', authenticate, getDrugs);
router.post('/drugs', authenticate, createDrug);
router.put('/drugs/:id', authenticate, updateDrug);
router.post('/drugs/:id/restock', authenticate, restockDrug);

// Category routes
router.get('/categories', authenticate, getCategories);
router.post('/categories', authenticate, createCategory);
router.delete('/categories/:id', authenticate, deleteCategory);

// Form routes
router.get('/forms', authenticate, getForms);
router.post('/forms', authenticate, createForm);
router.delete('/forms/:id', authenticate, deleteForm);

// Vendor routes
router.get('/vendors', authenticate, getVendors);
router.post('/vendors', authenticate, createVendor);
router.put('/vendors/:id', authenticate, updateVendor);
router.patch('/vendors/:id/toggle-active', authenticate, toggleVendorActive);

// Add this at the top of the routes
router.get('/test', (req, res) => {
  console.log('Inventory test route hit');
  res.json({ message: 'Inventory routes are working' });
});

// Add this with other routes
router.get('/transactions', authenticate, getTransactions);
router.post('/restock', authenticate, restock);
router.post('/restock/:id/approve', authenticate, isAdmin, approveRestock);
router.get('/restock/pending', authenticate, isAdmin, getPendingRestocks);
router.get('/restock/history', authenticate, getRestockHistory);

// Insurance routes
router.get('/insurance', authenticate, getInsuranceCompanies);
router.post('/insurance', authenticate, createInsuranceCompany);
router.put('/insurance/:id', authenticate, updateInsuranceCompany);
router.get('/insurance/drug/:drugId/markups', authenticate, getDrugInsuranceMarkups);

export default router; 