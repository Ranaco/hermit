import { Router, type Request, type RequestHandler, type Response } from "express";
import { checkHealth as checkEncryptionHealth } from "../services/encryption.service";

interface VaultHealthCheckResult {
  initialized: boolean;
  sealed: boolean;
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

    try {
      const vaultHealth = await checkVaultHealth();
      const vaultConnected = vaultHealth.initialized && !vaultHealth.sealed;

      res.status(200).json({
        status: vaultConnected ? "ok" : "error",
        vault_connected: vaultConnected,
        latency_ms: Math.max(Date.now() - startedAt, 1),
      });
    } catch {
      res.status(200).json({
        status: "error",
        vault_connected: false,
        latency_ms: 0,
      });
    }
  };
}

export default createHealthRouter;
