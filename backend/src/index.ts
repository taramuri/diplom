import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import { sequelize } from './models';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import analyzeRoutes from './routes/analyze';
import historyRoutes from './routes/history';

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '11mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/history', historyRoutes);

// Error handling (мають бути останніми)
app.use(notFoundHandler);
app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('✓ Database connection established');

    app.listen(PORT, () => {
      logger.info(`✓ Server running on http://localhost:${PORT}`);
      logger.info(`  Health: http://localhost:${PORT}/health`);
      logger.info(`  API:    http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
