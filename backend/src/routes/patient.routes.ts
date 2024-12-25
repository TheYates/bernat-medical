import express from 'express';
import { 
  registerPatient, 
  getPatientByClinicId,
  searchPatients 
} from '../controllers/patient.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/register', authenticate, registerPatient);
router.get('/search', authenticate, searchPatients);
router.get('/:clinicId', authenticate, getPatientByClinicId);

export default router; 