import express from 'express';
import cors from 'cors';
import { userRouter } from './routes/user.routes';
import { serviceRouter } from './routes/service.routes';
import { settingsRouter } from './routes/settings.routes';
import { auditRouter } from './routes/audit.routes';
import { clinicRouter } from './routes/clinic.routes';
import { inventoryRouter } from './routes/inventory.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/users', userRouter);
app.use('/api/services', serviceRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/clinic', clinicRouter);
app.use('/api/inventory', inventoryRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});