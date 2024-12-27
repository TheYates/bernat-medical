import express from 'express';
import { getDrugs } from '../controllers/drug.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Add error handling to auth middleware
const authWithLogging = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    await authenticate(req, res, next);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Test endpoint
router.get('/test', (req, res) => {
  console.log('Drug test endpoint hit');
  res.json({ message: 'Drug routes working' });
});

// Main endpoint
router.get('/', authWithLogging, getDrugs);

export default router; 