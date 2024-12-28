import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error';
import apiRouter from './routes/api';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 5000;

// Create and configure uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Debug route to check file existence
app.get('/api/uploads/*', (req, res, next) => {
  const fileName = req.path.replace('/api/uploads/', '');
  const filePath = path.join(uploadsDir, fileName);
  
  console.log('File request:', {
    requestPath: req.path,
    fileName,
    filePath,
    exists: fs.existsSync(filePath)
  });

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ 
      error: 'File not found',
      path: filePath
    });
  }

  res.sendFile(filePath);
});

// Regular middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/api', apiRouter);

// Error handling
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Upload path:', uploadsDir);
});