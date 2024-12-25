import express from 'express';
import { registerPatient, getLastPatientId } from '../controllers/patient.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/register', authenticate, registerPatient);
router.get('/last-id', authenticate, getLastPatientId);

export default router; 