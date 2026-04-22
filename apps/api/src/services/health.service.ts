import { log } from "@hermit/logger";
import { checkHealth as checkEncryptionHealth } from "./encryption.service";

export interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  vault_connected: boolean;
  latency_ms: number;
}

export interface VaultHealthState {
  initialized: boolean;
  sealed: boolean;
}

type VaultHealthCheck = () => Promise<VaultHealthState>;
type TimestampProvider = () => number;

export async function checkVaultConnection(
  checkVaultHealth: VaultHealthCheck = checkEncryptionHealth,
): Promise<boolean> {
  try {
    const vaultHealth = await checkVaultHealth();
    return vaultHealth.initialized && !vaultHealth.sealed;
  } catch (error) {
    log.error("Vault connection check failed", { error });
    return false;
  }
}

export async function getVaultHealthResponse(
  checkVaultHealth: VaultHealthCheck = checkEncryptionHealth,
  now: TimestampProvider = Date.now,
): Promise<HealthCheckResponse> {
  const startedAt = now();

  try {
    const vaultHealth = await checkVaultHealth();
    const vaultConnected = vaultHealth.initialized && !vaultHealth.sealed;

    return {
      status: vaultConnected ? "healthy" : "unhealthy",
      vault_connected: vaultConnected,
      latency_ms: now() - startedAt,
    };
  } catch (error) {
    log.warn("Vault health endpoint check failed", { error });

    return {
      status: "unhealthy",
      vault_connected: false,
      latency_ms: now() - startedAt,
    };
  }
}
