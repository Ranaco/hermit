/**
 * Security Middleware
 * Implements various security measures for the Hermit KMS API
 */

import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import type { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import config from '../config';

/**
 * Configure Helmet for security headers
 */
export function setupHelmet(app: Express): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Add additional security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

/**
 * Configure CORS
 */
export function setupCors(app: Express): void {
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      optionsSuccessStatus: config.cors.optionsSuccessStatus,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Device-Fingerprint',
        'X-MFA-Token',
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
    })
  );
}

/**
 * General rate limiter
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/readyz' || req.path === '/status';
  },
});

/**
 * Require a mutually authenticated TLS client identity for health endpoints.
 * Supports direct TLS termination on the app or a trusted proxy that forwards
 * the upstream verification result.
 */
export const requireHealthEndpointMtls: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const socketAuthorized = 'authorized' in req.socket && req.socket.authorized === true;
  const requestCameThroughTrustedProxy =
    req.ips.length > 0 && req.ip !== req.socket.remoteAddress;
  const proxyVerified = requestCameThroughTrustedProxy && (
    req.header('x-ssl-client-verify') === 'SUCCESS' ||
    req.header('ssl-client-verify') === 'SUCCESS'
  );

  if (socketAuthorized || proxyVerified) {
    next();
    return;
  }

  res.status(401).json({
    error: 'mTLS client certificate required',
  });
};

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Very strict rate limiter for sensitive operations
 */
export const sensitiveOperationsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    error: 'Too many sensitive operation requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for key encryption/decryption operations
 */
export const cryptoOperationsRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,
  message: {
    error: 'Too many cryptographic operations, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
