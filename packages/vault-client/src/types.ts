/**
 * Vault Client Types
 * Defines interfaces for HashiCorp Vault Transit Engine operations
 */

export interface VaultConfig {
  address?: string;
  endpoint?: string;
  token?: string;
  namespace?: string;
  transitMount?: string;
  requestTimeout?: number;
  skipVerify?: boolean;
  appRole?: {
    roleId: string;
    secretId?: string;
    wrappedSecretId?: string;
    mountPoint?: string;
  };
}

export interface EncryptOptions {
  keyName: string;
  plaintext: string;
  context?: string;
  keyVersion?: number;
  nonce?: string;
  convergent?: boolean;
}

export interface DecryptOptions {
  keyName: string;
  ciphertext: string;
  context?: string;
  nonce?: string;
}

export interface EncryptResult {
  ciphertext: string;
  keyVersion: number;
}

export interface DecryptResult {
  plaintext: string;
}

export interface KeyRotationResult {
  success: boolean;
  newVersion: number;
}

export interface KeyInfo {
  name: string;
  type: string;
  latestVersion: number;
  minDecryptionVersion: number;
  minEncryptionVersion: number;
  deletionAllowed: boolean;
  exportable: boolean;
  allowPlaintextBackup: boolean;
  keys: Record<string, KeyVersionInfo>;
}

export interface KeyVersionInfo {
  creationTime: string;
  publicKey?: string;
}

export interface RewrapOptions {
  keyName: string;
  ciphertext: string;
  context?: string;
  keyVersion?: number;
  nonce?: string;
}

export interface RewrapResult {
  ciphertext: string;
  keyVersion: number;
}

export interface SignOptions {
  keyName: string;
  input: string;
  hashAlgorithm?: string;
  signatureAlgorithm?: string;
  prehashed?: boolean;
  context?: string;
}

export interface SignResult {
  signature: string;
}

export interface VerifyOptions {
  keyName: string;
  input: string;
  signature: string;
  hashAlgorithm?: string;
  signatureAlgorithm?: string;
  prehashed?: boolean;
  context?: string;
}

export interface VerifyResult {
  valid: boolean;
}

export interface VaultHealth {
  initialized: boolean;
  sealed: boolean;
  standby: boolean;
  performanceStandby: boolean;
  replicationPerformanceMode: string;
  replicationDrMode: string;
  serverTimeUtc: number;
  version: string;
  clusterName: string;
  clusterId: string;
}

export interface DataKeyGenerateOptions {
  keyName: string;
  bits?: number;
  context?: string;
  nonce?: string;
}

export interface DataKeyGenerateResult {
  plaintext: string;
  ciphertext: string;
  keyVersion: number;
}

export type KeyType = "aes256-gcm96" | "aes128-gcm96" | "chacha20-poly1305" | "ed25519" | "ecdsa-p256" | "ecdsa-p384" | "ecdsa-p521" | "rsa-2048" | "rsa-3072" | "rsa-4096";

export interface CreateKeyOptions {
  convergentEncryption?: boolean;
  derived?: boolean;
  exportable?: boolean;
  allowPlaintextBackup?: boolean;
  type?: KeyType;
  autoRotatePeriod?: string;
}

export interface VaultError extends Error {
  statusCode?: number;
  response?: {
    statusCode: number;
    body?: {
      errors?: string[];
      [key: string]: unknown;
    };
  };
}
