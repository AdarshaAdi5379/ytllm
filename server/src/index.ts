import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import transcriptRouter from './routes/transcript';
import chatRouter from './routes/chat';
import exportRouter from './routes/export';
import healthRouter from './routes/health';
import { rateLimiter } from './middleware/rateLimit';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Logging
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Rate limiting
app.use('/api/', rateLimiter);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/transcript', transcriptRouter);
app.use('/api/chat', chatRouter);
app.use('/api/export', exportRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
});

app.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port} (${config.nodeEnv})`);
});

export default app;
