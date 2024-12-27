import express from 'express';
import { authenticate } from '../middleware/auth';
import { 
  createPrescription,
  getPrescriptionHistory,
  deletePrescription 
} from '../controllers/prescription.controller';

const router = express.Router();

router.get('/:patientId/history', authenticate, getPrescriptionHistory);
router.post('/:patientId', authenticate, createPrescription);
router.delete('/:id', authenticate, deletePrescription);

export default router; 