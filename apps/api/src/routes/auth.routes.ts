/**
 * Authentication Routes
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter, sensitiveOperationsRateLimiter } from '../middleware/security';
import { validate } from '../validators/validation.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  verifyMfaSetupSchema,
  disableMfaSchema,
  enrollCliDeviceSchema,
} from '../validators/auth.validator';

const router = Router();

/**
 * Public routes
 */
router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refreshToken);

/**
 * Protected routes (require authentication)
 */
router.post('/logout', authenticate, validate({ body: logoutSchema }), authController.logout);

/**
 * MFA routes
 */
router.post('/mfa/setup', authenticate, authController.setupMfa);
router.post('/mfa/enable', authenticate, sensitiveOperationsRateLimiter, validate({ body: verifyMfaSetupSchema }), authController.enableMfa);
router.post('/mfa/disable', authenticate, sensitiveOperationsRateLimiter, validate({ body: disableMfaSchema }), authController.disableMfa);

/**
 * Device management
 */
router.get('/devices', authenticate, authController.getDevices);
router.delete('/devices/:id', authenticate, authController.removeDevice);
router.post('/cli/enroll', authenticate, validate({ body: enrollCliDeviceSchema }), authController.enrollCliDevice);

export default router;
