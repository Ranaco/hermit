import { Router, type Request, type RequestHandler, type Response } from "express";
import config from "../config";
import { checkHealth as checkEncryptionHealth } from "../services/encryption.service";

interface VaultHealthCheckResult {
  initialized: boolean;
  sealed: boolean;
}

interface HealthResponseBody {
  status: "ok" | "error";
  vault_connected: boolean;
  latency_ms: number;
  timestamp: string;
  uptime: number;
  environment: string;
}

interface CreateHealthRouterOptions {
  checkVaultHealth?: () => Promise<VaultHealthCheckResult>;
}

export function createHealthRouter(
  options: CreateHealthRouterOptions = {},
): Router {
  const router = Router();
  router.get("/health", createHealthHandler(options));

  return router;
}

export function createHealthHandler(
  options: CreateHealthRouterOptions = {},
): RequestHandler {
  const checkVaultHealth = options.checkVaultHealth ?? checkEncryptionHealth;

  return async (_req: Request, res: Response) => {
    const startedAt = Date.now();
    const createResponseBody = (
      status: HealthResponseBody["status"],
      vaultConnected: boolean,
      latencyMs: number,
    ): HealthResponseBody => ({
      status,
      vault_connected: vaultConnected,
      latency_ms: latencyMs,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.app.env,
    });

    try {
      const vaultHealth = await checkVaultHealth();
      const vaultConnected = vaultHealth.initialized && !vaultHealth.sealed;

      res
        .status(200)
        .json(
          createResponseBody(
            vaultConnected ? "ok" : "error",
            vaultConnected,
            Math.max(Date.now() - startedAt, 1),
          ),
        );
    } catch {
      res.status(200).json(createResponseBody("error", false, 0));
    }
  };
}

export default createHealthRouter;
