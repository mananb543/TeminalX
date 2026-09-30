import express from 'express';
import dotenv from 'dotenv';
import marketRoutes from './routes/marketRoutes.ts';
import tradingRoutes from './routes/tradingRoutes.ts';
import authRoutes from './routes/authRoutes.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { connectDatabase } from './config/database.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API Endpoints
app.use('/api/markets', marketRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'TERMINALX',
    stage: 'STAGE_1_PAPER_TRADING',
    timestamp: new Date().toISOString(),
  });
});

// Centralized Error Handling
app.use(errorHandler);

export default app;
