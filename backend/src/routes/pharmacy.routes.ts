import express from 'express';
import { authenticate } from '../middleware/auth';
import { 
  getPendingPrescriptions,
  searchDrugs,
  createSale,
  getWaitingList
} from '../controllers/pharmacy.controller';
import { dispense } from '../controllers/prescription.controller';

const router = express.Router();

// Dispensing routes
router.get('/prescriptions/:patientId/pending', authenticate, getPendingPrescriptions);
router.post('/prescriptions/dispense', authenticate, dispense);
router.get('/prescriptions/waiting-list', authenticate, getWaitingList);

// POS routes
router.get('/drugs/search', authenticate, searchDrugs);
router.post('/sales', authenticate, createSale);

export default router; 