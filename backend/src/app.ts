import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import { env, isProduction } from './config/env';
import { logger } from './config/logger';
import { globalLimiter } from './middleware/rateLimiter';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';
import { rootRouter } from './routes';

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const morganStream = {
  write: (message: string) => logger.info(message.trim()),
};
app.use(morgan(isProduction ? 'combined' : 'dev', { stream: morganStream }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(env.API_PREFIX, globalLimiter, rootRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
