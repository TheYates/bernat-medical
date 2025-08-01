import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthenticatedRequest } from '../types/auth';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    // console.log('Auth header received:', authHeader?.substring(0, 20) + '...');
    
    if (!authHeader?.startsWith('Bearer ')) {
      // console.log('No Bearer token found');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded as { id: number; role: string };
      next();
    } catch (jwtError) {
      // console.error('JWT Verification failed:', jwtError);
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

export const isAdmin = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    next();
  } catch (error) {
    // console.error('Admin check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 