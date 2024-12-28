import express from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { 
  getXrayRequestHistory, 
  getWaitingList, 
  updateResult, 
  deleteXrayRequest 
} from '../controllers/xray-request.controller';

const router = express.Router();

router.get('/waiting-list', authenticate, getWaitingList);
router.get('/:patientId/history', authenticate, getXrayRequestHistory);
router.post('/:requestId/result', authenticate, upload.single('file'), updateResult);
router.delete('/:requestId', authenticate, deleteXrayRequest);

export default router; 