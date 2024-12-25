import express from 'express';
import { getServices, createServiceRequest, getServiceRequestHistory, cancelServiceRequest } from '../controllers/service.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getServices);
router.post('/request', authenticate, createServiceRequest);
router.get('/requests/:patientId', authenticate, getServiceRequestHistory);
router.patch('/requests/:requestId/cancel', authenticate, cancelServiceRequest);

export default router; 