import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import partsRoutes from './routes/parts';
import salesRoutes from './routes/sales';
import dashboardRoutes from './routes/dashboard';
import usersRoutes from './routes/users';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/parts',     authenticateToken, partsRoutes);
app.use('/api/sales',     authenticateToken, salesRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/users',     authenticateToken, usersRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🏍️  IJA-POS server running on port ${PORT}`);
});
