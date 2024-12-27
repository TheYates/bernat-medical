import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error';
import apiRouter from './routes/api';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Mount all routes under /api
app.use('/api', apiRouter);

// Error handling
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});