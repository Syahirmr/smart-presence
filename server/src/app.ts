import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './lib/logger.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { healthRouter } from './modules/health/health.route.js';
import { enrollmentRouter } from './modules/enrollment/enrollment.route.js';
import { attendanceRouter } from './modules/attendance/attendance.route.js';

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const app = express();

app.disable('x-powered-by');

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.use('/api/health', healthRouter);
app.use('/api/enroll', enrollmentRouter);
app.use('/api/attendance', attendanceRouter); // <-- Tambahin ini brok

app.use(notFoundHandler);
app.use(errorHandler);