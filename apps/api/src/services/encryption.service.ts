/**
 * Encryption Service
 * Wraps Vault Transit Engine for encryption operations
 */

import { createVaultService } from "@hermit/vault-client";
import config from "../config";

// Initialize Vault service using factory exported by the vault-client package
const writeAppRole = (config.vault.appRole.writeRoleId && config.vault.appRole.writeSecretId)
  ? {
      roleId: config.vault.appRole.writeRoleId,
      secretId: config.vault.appRole.writeSecretId,
    }
  : undefined;

const vaultService = createVaultService({
  endpoint: config.vault.endpoint,
  token: config.vault.token,
  namespace: config.vault.namespace,
  transitMount: config.vault.transitMount,
  appRole: writeAppRole,
} as any); // Cast to any because the exported types from the built package might not be immediately synced

const initializationPromise = (vaultService as any).initialize().catch((err: any) => {
    // We log this but do not strictly crash the node process since VaultHealth middleware handles the 503s gracefully
  console.error("Failed to initialize VaultService (AppRole token fetch)", err);
  throw err;
});

async function ensureVaultReady(): Promise<void> {
  await initializationPromise;
}

/**
 * Encrypt plaintext data
 */
export async function encrypt(
  keyName: string,
  plaintext: string,
): Promise<string> {
  await ensureVaultReady();
  const result = await vaultService.encrypt({ keyName, plaintext });
  return result.ciphertext;
}

/**
 * Decrypt ciphertext
 */
export async function decrypt(
  keyName: string,
  ciphertext: string,
): Promise<string> {
  await ensureVaultReady();
  const result = await vaultService.decrypt({ keyName, ciphertext });
  return result.plaintext;
}

/**
 * Batch encrypt multiple values
 */
export async function batchEncrypt(
  keyName: string,
  plaintexts: string[],
): Promise<string[]> {
  const batchInput = plaintexts.map((plaintext) => ({ plaintext }));
  await ensureVaultReady();
  const results = await vaultService.batchEncrypt(keyName, batchInput);
  return results.map((r) => r.ciphertext);
}

/**
 * Batch decrypt multiple values
 */
export async function batchDecrypt(
  keyName: string,
  ciphertexts: string[],
): Promise<string[]> {
  const batchInput = ciphertexts.map((ciphertext) => ({ ciphertext }));
  await ensureVaultReady();
  const results = await vaultService.batchDecrypt(keyName, batchInput);
  return results.map((r) => r.plaintext);
}

/**
 * Create a new encryption key in Vault
 */
export async function createKey(keyName: string): Promise<void> {
  await ensureVaultReady();
  await vaultService.createKey(keyName);
}

/**
 * Rotate an encryption key
 */
export async function rotateKey(keyName: string): Promise<void> {
  await ensureVaultReady();
  await vaultService.rotateKey(keyName);
}

/**
 * Rewrap ciphertext with latest key version
 */
export async function rewrap(
  keyName: string,
  ciphertext: string,
): Promise<string> {
  await ensureVaultReady();
  const result = await vaultService.rewrap({ keyName, ciphertext });
  return result.ciphertext;
}

/**
 * Get key information
 */
export async function getKeyInfo(keyName: string) {
  await ensureVaultReady();
  return await vaultService.getKeyInfo(keyName);
}

/**
 * Delete a key
 */
export async function deleteKey(keyName: string): Promise<void> {
  await ensureVaultReady();
  await vaultService.deleteKey(keyName);
}

/**
 * Generate a data key (for envelope encryption)
 */
export async function generateDataKey(keyName: string): Promise<{
  plaintext: string;
  ciphertext: string;
}> {
  await ensureVaultReady();
  return await vaultService.generateDataKey({ keyName });
}

/**
 * List all keys
 */
export async function listKeys(): Promise<string[]> {
  await ensureVaultReady();
  return await vaultService.listKeys();
}

/**
 * Check Vault health
 */
export async function checkHealth() {
  await ensureVaultReady();
  return await vaultService.checkHealth();
}

/**
 * Test Vault connection
 */
export async function testConnection(): Promise<boolean> {
  await ensureVaultReady();
  return await vaultService.testConnection();
}

export default {
  encrypt,
  decrypt,
  batchEncrypt,
  batchDecrypt,
  createKey,
  rotateKey,
  rewrap,
  getKeyInfo,
  deleteKey,
  generateDataKey,
  listKeys,
  checkHealth,
  testConnection,
};
