/**
 * Hermit KMS API Server
 * Production-ready Express server with comprehensive security and middleware
 */

import express, { type Express, type Request, type RequestHandler, type Response } from "express";
import { json, urlencoded } from "body-parser";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import { log, httpLogStream } from "@hermit/logger";
import { errorHandler, notFoundHandler } from "@hermit/error-handling";
import config from "./config";
import {
  setupHelmet,
  setupCors,
  generalRateLimiter,
} from "./middleware/security";
import { requestContext, logRequestCompletion } from "./middleware/context";
import getPrismaClient, { checkDatabaseConnection } from "./services/prisma.service";
import { checkHealth as checkEncryptionHealth } from "./services/encryption.service";

// Import routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import organizationRoutes from "./routes/organization.routes";
import vaultRoutes from "./routes/vault.routes";
import keyRoutes from "./routes/key.routes";
import secretRoutes from "./routes/secret.routes";
import groupRoutes from "./routes/group.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import auditRoutes from "./routes/audit.routes";
import shareRoutes from "./routes/share.routes";

interface VaultHealthResponse {
  status: string;
  vault_connected: boolean;
  latency_ms: number;
}

async function getVaultHealthResponse(): Promise<VaultHealthResponse> {
  const startedAt = Date.now();

  try {
    await checkEncryptionHealth();

    return {
      status: "healthy",
      vault_connected: true,
      latency_ms: Date.now() - startedAt,
    };
  } catch (error) {
    log.error("Vault connection check failed", { error });

    return {
      status: "degraded",
      vault_connected: false,
      latency_ms: Date.now() - startedAt,
    };
  }
}

/**
 * Create and configure Express application
 */
export const createServer = (): Express => {
  const app = express();

  // Trust only the first proxy hop (e.g., nginx, AWS ALB).
  // Using `true` would allow clients to spoof X-Forwarded-For.
  app.set("trust proxy", 1);

  // Disable x-powered-by header
  app.disable("x-powered-by");

  // Security middleware
  setupHelmet(app);
  setupCors(app);

  // Request parsing middleware
  app.use(compression() as unknown as RequestHandler); // Compress responses
  app.use(json({ limit: "1mb" })); // Parse JSON bodies
  app.use(urlencoded({ extended: true, limit: "1mb" })); // Parse URL-encoded bodies
  app.use(cookieParser()); // Parse cookies

  // Logging middleware
  if (config.app.env !== "test") {
    app.use(
      morgan("combined", {
        stream: httpLogStream,
        skip: (req: Request) =>
          req.path === "/health" || req.path === "/status",
      }),
    );
  }

  // Request context and tracking
  app.use(requestContext);
  app.use(logRequestCompletion);

  // Rate limiting (applied globally, can be overridden per route)
  app.use(generalRateLimiter);

  // ==================== HEALTH & STATUS ROUTES ====================

  /**
   * Health check endpoint
   * Returns Vault connectivity status
   */
  app.get("/health", async (_req: Request, res: Response) => {
    const health = await getVaultHealthResponse();
    res.status(200).json(health);
  });

  /**
   * Detailed status endpoint
   * Includes database and Vault connectivity
   */
  app.get("/status", async (_req: Request, res: Response) => {
    const [dbStatus, vaultStatus] = await Promise.all([
      checkDatabaseConnection().catch(() => false),
      checkVaultConnection().catch(() => false),
    ]);

    const status = {
      api: "operational",
      database: dbStatus ? "connected" : "disconnected",
      vault: vaultStatus ? "connected" : "disconnected",
      version: config.app.version,
      environment: config.app.env,
      timestamp: new Date().toISOString(),
    };

    const httpStatus = dbStatus && vaultStatus ? 200 : 503;
    res.status(httpStatus).json(status);
  });

  // ==================== API ROUTES ====================

  app.use(`${config.app.apiPrefix}/auth`, authRoutes);
  app.use(`${config.app.apiPrefix}/users`, userRoutes);
  app.use(`${config.app.apiPrefix}/organizations`, organizationRoutes);
  app.use(`${config.app.apiPrefix}/vaults`, vaultRoutes);
  app.use(`${config.app.apiPrefix}/vaults/:vaultId/groups`, groupRoutes);
  app.use(`${config.app.apiPrefix}/keys`, keyRoutes);
  app.use(`${config.app.apiPrefix}/secrets`, secretRoutes);
  app.use(`${config.app.apiPrefix}/onboarding`, onboardingRoutes);
  app.use(`${config.app.apiPrefix}/audit`, auditRoutes);
  app.use(`${config.app.apiPrefix}/shares`, shareRoutes);

  // Temporary placeholder route
  app.get(`${config.app.apiPrefix}/info`, (_req: Request, res: Response) => {
    res.json({
      name: config.app.name,
      version: config.app.version,
      description: "Hermit Key Management System API",
      features: config.features,
    });
  });

  // ==================== ERROR HANDLING ====================

  // 404 handler (must be after all routes)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};

/**
 * Check Vault connectivity
 */
async function checkVaultConnection(): Promise<boolean> {
  const health = await getVaultHealthResponse();
  return health.vault_connected;
}

/**
 * Initialize application
 * Performs startup checks and setup
 */
export async function initializeApp(): Promise<void> {
  log.info("Initializing Hermit KMS API...", {
    environment: config.app.env,
    version: config.app.version,
  });

  // Check database connection
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    throw new Error("Failed to connect to database");
  }

  // Check Vault connection
  const vaultConnected = await checkVaultConnection();
  if (!vaultConnected) {
    log.warn("Vault connection failed - some features may be unavailable");
  }

  // TODO: Run database migrations if needed
  log.info("Database migrations check skipped (managed externally)");
  
  // TODO: Initialize Vault keys if needed
  log.info("Vault keys initialization check skipped (managed by operator-controlled Vault bootstrap)");

  log.info("Application initialized successfully");
}

/**
 * Graceful shutdown handler
 */
export async function gracefulShutdown(signal: string): Promise<void> {
  log.info(`Received ${signal}, starting graceful shutdown...`);

  const prisma = getPrismaClient();
  await prisma.$disconnect();
  log.info("Database connection closed");

  log.info("Graceful shutdown complete");
  process.exit(0);
}
