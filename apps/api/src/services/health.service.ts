import { log } from "@hermit/logger";
import { checkDatabaseConnection } from "./prisma.service";
import { checkHealth as checkEncryptionHealth } from "./encryption.service";

/**
 * Health check result interface
 */
export interface VaultHealthInfo {
  connected: boolean;
  latency_ms: number;
}

/**
 * Check Vault connectivity and measure latency
 */
export async function getVaultHealth(): Promise<VaultHealthInfo> {
  const start = performance.now();
  let connected = false;

  try {
    await checkEncryptionHealth();
    connected = true;
  } catch (error) {
    log.error("Vault health check failed", { error });
    connected = false;
  }

  const latency = performance.now() - start;

  return {
    connected,
    latency_ms: Number(latency.toFixed(3)),
  };
}

/**
 * Check overall system status
 */
export async function getSystemStatus() {
  const [dbConnected, vaultHealth] = await Promise.all([
    checkDatabaseConnection().catch(() => false),
    getVaultHealth(),
  ]);

  return {
    database: dbConnected ? "connected" : "disconnected",
    vault: vaultHealth.connected ? "connected" : "disconnected",
    vault_latency_ms: vaultHealth.latency_ms,
    healthy: dbConnected && vaultHealth.connected,
  };
}
