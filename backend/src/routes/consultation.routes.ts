import express from 'express';
import { authenticate } from '../middleware/auth';
import { createConsultation, getComplaintsHistory, getClinicalNotesHistory, getDiagnosisHistory, getTreatmentHistory, getConsultationDetails } from '../controllers/consultation.controller';

const router = express.Router();

router.post('/:patientId', authenticate, (req, res, next) => {
  console.log('Consultation route hit:', req.params.patientId);
  next();
}, createConsultation);

router.get('/:patientId/complaints/history', authenticate, getComplaintsHistory);
router.get('/:patientId/clinical-notes/history', authenticate, getClinicalNotesHistory);
router.get('/:patientId/diagnosis/history', authenticate, getDiagnosisHistory);
router.get('/:patientId/treatment/history', authenticate, getTreatmentHistory);
router.get('/:patientId/details/:consultationId', authenticate, getConsultationDetails);

export default router; 