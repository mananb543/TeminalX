import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './server/routes/authRoutes.ts';
import marketRoutes from './server/routes/marketRoutes.ts';
import tradingRoutes from './server/routes/tradingRoutes.ts';
import { errorHandler } from './server/middleware/errorHandler.ts';
import { connectDatabase, dbState } from './server/config/database.ts';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// CORS Configuration supporting credentials and frontend clients
app.use(
  cors({
    origin: (_origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/trading', tradingRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    app: 'TERMINALX',
    stage: 'STAGE_3_REAL_MARKET_DATA',
    database: {
      status: dbState.status,
      storageType: dbState.storageType,
      isConnected: dbState.isConnected,
      dbName: dbState.dbName,
    },
    timestamp: new Date().toISOString(),
  });
});

// Database status & management endpoints
app.get('/api/database/status', (_req, res) => {
  res.json({
    success: true,
    status: dbState.status,
    storageType: dbState.storageType,
    isConnected: dbState.isConnected,
    dbName: dbState.dbName,
    lastAuthError: dbState.lastAuthError,
    connectedAt: dbState.connectedAt,
  });
});

app.post('/api/database/reconnect', async (req, res) => {
  const customUri = req.body?.uri;
  const ok = await connectDatabase(customUri);
  res.json({
    success: ok,
    status: dbState.status,
    storageType: dbState.storageType,
    isConnected: dbState.isConnected,
    dbName: dbState.dbName,
    message: ok
      ? `Connected successfully to MongoDB Atlas (${dbState.dbName}).`
      : 'MongoDB Atlas authentication requires updated credentials. Running in DISCONNECTED / IN-MEMORY Mode.',
  });
});

// Centralized Error Handling for API routes
app.use('/api', errorHandler);

// Connect to MongoDB Atlas (with graceful fallback)
connectDatabase().catch((err) => {
  console.warn('[TerminalX Startup]: Initial MongoDB connection check completed:', err.message);
});

// Mount Vite middleware in development, or serve built static assets in production
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[TerminalX Server]: Operational on http://0.0.0.0:${PORT}`);
});

export default app;
