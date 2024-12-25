import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { recordVitalSigns, getVitalSignsHistory, getWaitingList } from '../controllers/vital.controller';

const router = Router();

// Get waiting list of patients needing vital signs
router.get('/waiting-list', authenticate, getWaitingList);

// Get vital signs history for a specific patient
router.get('/:patientId', authenticate, getVitalSignsHistory);

// Record new vital signs
router.post('/', authenticate, recordVitalSigns);

export default router; 