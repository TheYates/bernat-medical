import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';

const app = express();

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRouter);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Available routes:', 
    app._router.stack
      .filter((r: any) => r.route)
      .map((r: any) => `${Object.keys(r.route.methods)} ${r.route.path}`)
  );
});

export default app; 