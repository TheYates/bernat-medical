import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error';
import apiRoutes from './routes/api';
import prescriptionRoutes from './routes/prescription.routes';
import path from 'path';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api', apiRoutes);
app.use('/api/prescriptions', prescriptionRoutes);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error handling
app.use(errorHandler);

export default app; 