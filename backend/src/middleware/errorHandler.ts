import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';

interface ErrorResponseBody {
  success: false;
  message: string;
  errors?: unknown;
  stack?: string;
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    if (!err.isOperational) {
      logger.error(`Non-operational error: ${err.message}`, { stack: err.stack, path: req.path });
    }

    const body: ErrorResponseBody = {
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    };

    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'A record with the given unique field already exists',
        errors: err.meta,
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Requested resource was not found',
      });
      return;
    }

    logger.error(`Prisma known error [${err.code}]: ${err.message}`, { path: req.path });
    res.status(500).json({
      success: false,
      message: 'Database error occurred',
    });
    return;
  }

  const error = err instanceof Error ? err : new Error('Unknown error');
  logger.error(`Unhandled error: ${error.message}`, { stack: error.stack, path: req.path });

  const body: ErrorResponseBody = {
    success: false,
    message: isProduction ? 'Internal server error' : error.message,
    ...(isProduction ? {} : { stack: error.stack }),
  };

  res.status(500).json(body);
}
