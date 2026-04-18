import { checkHealth as checkEncryptionHealth } from "./services/encryption.service";
import { checkDatabaseConnection } from "./services/prisma.service";

let applicationReady = false;

export function markApplicationReady(): void {
  applicationReady = true;
}

export function resetApplicationReadiness(): void {
  applicationReady = false;
}

export type ReadinessState = {
  status: "ready" | "not_ready";
};

type VaultHealthState = {
  initialized?: boolean;
  sealed?: boolean;
};

export function isVaultReady(health: VaultHealthState): boolean {
  return health.initialized !== false && health.sealed !== true;
}

export async function getReadinessState(): Promise<ReadinessState> {
  if (!applicationReady) {
    return { status: "not_ready" };
  }

  const [databaseReady, vaultReady] = await Promise.all([
    checkDatabaseConnection().catch(() => false),
    checkEncryptionHealth()
      .then((health) => isVaultReady(health))
      .catch(() => false),
  ]);

  return databaseReady && vaultReady
    ? { status: "ready" }
    : { status: "not_ready" };
}
