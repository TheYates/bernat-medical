import express from 'express';
import { authenticate } from '../middleware/auth';
import { 
  getWaitingList,
  getPatientHistory,
  updateResult,
  deleteRequest,
  updateStatus
} from '../controllers/lab-request.controller';
import { upload } from '../middleware/upload';

const router = express.Router();

router.get('/waiting-list', authenticate, getWaitingList);
router.get('/:patientId/history', authenticate, getPatientHistory);
router.post('/:requestId/result', authenticate, upload.single('file'), updateResult);
router.delete('/:requestId', authenticate, deleteRequest);
router.patch('/:requestId/status', authenticate, updateStatus);

export default router; 