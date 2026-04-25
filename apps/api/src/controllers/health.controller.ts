import type { Request, Response } from "express";
import { asyncHandler } from "@hermit/error-handling";
import { getVaultHealth, getSystemStatus } from "../services/health.service";
import config from "../config";

/**
 * Health check endpoint
 * GET /health
 */
export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const vaultHealth = await getVaultHealth();

  res.json({
    status: vaultHealth.connected ? "healthy" : "degraded",
    vault_connected: vaultHealth.connected,
    latency_ms: vaultHealth.latency_ms,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
    version: config.app.version,
  });
});

/**
 * Detailed status endpoint
 * GET /status
 */
export const statusCheck = asyncHandler(async (_req: Request, res: Response) => {
  const systemStatus = await getSystemStatus();

  res.status(systemStatus.healthy ? 200 : 503).json({
    api: "operational",
    database: systemStatus.database,
    vault: systemStatus.vault,
    vault_latency_ms: systemStatus.vault_latency_ms,
    version: config.app.version,
    environment: config.app.env,
    timestamp: new Date().toISOString(),
  });
});
