import { Request, Response, NextFunction } from "express";
import logger from "@hermit/logger";
import encryptionService from "../services/encryption.service";

/**
 * Middleware to check HashiCorp Vault health before processing requests
 * Ensures the node process degrades gracefully with a 503 rather than throwing 500 unhandled errors.
 */
export const requireVaultHealth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const health = await encryptionService.checkHealth();
    
    if (!health.initialized) {
      res.status(503).json({
        success: false,
        error: "Service Unavailable",
        message: "Key Management System is currently initializing. Please try again later.",
      });
      return;
    }
    
    if (health.sealed) {
      res.status(503).json({
        success: false,
        error: "Service Unavailable",
        message: "Key Management System is currently sealed for maintenance. Please try again later.",
      });
      return;
    }
    
    next();
  } catch (error: any) {
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
      logger.error("HashiCorp Vault is unreachable (Connection Refused).");
    } else {
      logger.error("Failed to verify Vault health state", { error });
    }
    res.status(503).json({
      success: false,
      error: "Service Unavailable",
      message: "Key Management System is currently unreachable or starting up.",
    });
  }
};
