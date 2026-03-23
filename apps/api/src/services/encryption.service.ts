/**
 * Encryption Service
 * Wraps Vault Transit Engine for encryption operations
 */

import { createVaultService } from "@hermit/vault-client";
import config from "../config";

const writeAppRole =
  config.vault.appRole.writeRoleId &&
  (config.vault.appRole.writeSecretId || config.vault.appRole.writeWrappedSecretId)
    ? {
        roleId: config.vault.appRole.writeRoleId,
        secretId: config.vault.appRole.writeSecretId || undefined,
        wrappedSecretId: config.vault.appRole.writeWrappedSecretId || undefined,
      }
    : undefined;

const vaultService = createVaultService({
  endpoint: config.vault.endpoint,
  token: config.vault.token,
  namespace: config.vault.namespace,
  transitMount: config.vault.transitMount,
  requestTimeout: config.vault.requestTimeout,
  skipVerify: config.vault.skipVerify,
  appRole: writeAppRole,
});

let initializationPromise: Promise<void> | null = null;

function getInitializationPromise(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = vaultService.initialize().catch((err: unknown) => {
      initializationPromise = null;
      console.error("Failed to initialize VaultService (AppRole token fetch)", err);
      throw err;
    });
  }

  return initializationPromise;
}

async function ensureVaultReady(): Promise<void> {
  await getInitializationPromise();
}

export async function encrypt(keyName: string, plaintext: string): Promise<string> {
  await ensureVaultReady();
  const result = await vaultService.encrypt({ keyName, plaintext });
  return result.ciphertext;
}

export async function decrypt(keyName: string, ciphertext: string): Promise<string> {
  await ensureVaultReady();
  const result = await vaultService.decrypt({ keyName, ciphertext });
  return result.plaintext;
}

export async function batchEncrypt(keyName: string, plaintexts: string[]): Promise<string[]> {
  await ensureVaultReady();
  const results = await vaultService.batchEncrypt(
    keyName,
    plaintexts.map((plaintext) => ({ plaintext })),
  );
  return results.map((result) => result.ciphertext);
}

export async function batchDecrypt(keyName: string, ciphertexts: string[]): Promise<string[]> {
  await ensureVaultReady();
  const results = await vaultService.batchDecrypt(
    keyName,
    ciphertexts.map((ciphertext) => ({ ciphertext })),
  );
  return results.map((result) => result.plaintext);
}

export async function createKey(keyName: string): Promise<void> {
  await ensureVaultReady();
  await vaultService.createKey(keyName);
}

export async function rotateKey(keyName: string): Promise<void> {
  await ensureVaultReady();
  await vaultService.rotateKey(keyName);
}

export async function rewrap(keyName: string, ciphertext: string): Promise<string> {
  await ensureVaultReady();
  const result = await vaultService.rewrap({ keyName, ciphertext });
  return result.ciphertext;
}

export async function getKeyInfo(keyName: string) {
  await ensureVaultReady();
  return await vaultService.getKeyInfo(keyName);
}

export async function deleteKey(keyName: string): Promise<void> {
  await ensureVaultReady();
  await vaultService.deleteKey(keyName);
}

export async function generateDataKey(
  keyName: string,
): Promise<{ plaintext: string; ciphertext: string }> {
  await ensureVaultReady();
  return await vaultService.generateDataKey({ keyName });
}

export async function listKeys(): Promise<string[]> {
  await ensureVaultReady();
  return await vaultService.listKeys();
}

export async function checkHealth() {
  await ensureVaultReady();
  return await vaultService.checkHealth();
}

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
