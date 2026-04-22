import { performance } from "node:perf_hooks";
import { log } from "@hermit/logger";
import config from "../config";
import { HEALTH_STATUS, type HealthStatus } from "../constants/health";
import { checkHealth as checkEncryptionHealth } from "./encryption.service";

export interface VaultConnectionCheckResult {
  vaultConnected: boolean;
  latencyMs: number;
}

export interface VaultHealthResponse {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  environment: string;
  vault_connected: boolean;
  latency_ms: number;
}

export async function checkVaultConnectionStatus(): Promise<VaultConnectionCheckResult> {
  const startedAt = performance.now();

  try {
    await checkEncryptionHealth();

    return {
      vaultConnected: true,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    log.error("Vault connection check failed", { error });

    return {
      vaultConnected: false,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

export async function getVaultHealthResponse(): Promise<VaultHealthResponse> {
  const { vaultConnected, latencyMs } = await checkVaultConnectionStatus();

  return {
    status: vaultConnected ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
    vault_connected: vaultConnected,
    latency_ms: latencyMs,
  };
}
