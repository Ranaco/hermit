import vault from "node-vault";
import { log } from "./logger";
import type {
  VaultConfig,
  EncryptOptions,
  DecryptOptions,
  EncryptResult,
  DecryptResult,
  KeyRotationResult,
  KeyInfo,
  KeyVersionInfo,
  RewrapOptions,
  RewrapResult,
  SignOptions,
  SignResult,
  VerifyOptions,
  VerifyResult,
  VaultHealth,
  DataKeyGenerateOptions,
  DataKeyGenerateResult,
  CreateKeyOptions,
  VaultError,
} from "./types";

/**
 * VaultService - A comprehensive wrapper for HashiCorp Vault Transit Engine
 *
 * This service provides:
 * - Encryption/Decryption using Transit Engine
 * - Key versioning and rotation
 * - Data key generation (envelope encryption)
 * - Digital signatures and verification
 * - Key management operations
 * - Health checks and monitoring
 */
export class VaultService {
  private client: vault.client;
  private transitMount: string;
  private config: VaultConfig;
  private tokenRenewalTimer?: NodeJS.Timeout;

  constructor(config: VaultConfig) {
    this.config = config;
    this.transitMount = config.transitMount || "transit";

    // Initialize Vault client
    this.client = vault({
      apiVersion: "v1",
      endpoint: config.endpoint,
      token: config.token, // Can be undefined initially if using approle
      namespace: config.namespace,
      requestOptions: {
        timeout: config.requestTimeout || 5000,
      },
    });

    log.info("VaultService initialized", {
      endpoint: config.endpoint,
      transitMount: this.transitMount,
      namespace: config.namespace,
    });
  }

  /**
   * Initialize service, performs AppRole login if configured
   */
  async initialize(): Promise<void> {
    if (!this.config.token && this.config.appRole) {
      await this.loginWithAppRole();
    } else if (this.config.token) {
      // If we provided a token, try to schedule renewal for it assuming it's renewable
      await this.scheduleTokenRenewal();
    }
  }

  /**
   * Authenticate with Vault using AppRole
   */
  private async loginWithAppRole(): Promise<void> {
    if (!this.config.appRole) {
      throw new Error("AppRole configuration missing");
    }

    try {
      const { roleId, secretId, mountPoint = "approle" } = this.config.appRole;
      
      const response = await this.client.write(`auth/${mountPoint}/login`, {
        role_id: roleId,
        secret_id: secretId,
      });

      const clientToken = response.auth.client_token;
      
      // Update client with new token
      this.client = vault({
        apiVersion: "v1",
        endpoint: this.config.endpoint,
        token: clientToken,
        namespace: this.config.namespace,
        requestOptions: {
          timeout: this.config.requestTimeout || 5000,
        },
      });

      log.info("Successfully authenticated with Vault via AppRole");
      await this.scheduleTokenRenewal(response.auth);
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
         log.error("Vault connection refused during AppRole login");
      } else {
         log.error("Vault AppRole login failed", { error });
      }
      // Cannot throw here easily if we want graceful degradation, 
      // but without a token future calls will fail. The healthcheck middleware handles this safely.
    }
  }

  /**
   * Schedule Vault token renewal
   */
  private async scheduleTokenRenewal(authInfo?: any): Promise<void> {
    if (this.tokenRenewalTimer) {
      clearTimeout(this.tokenRenewalTimer);
    }

    try {
      // If authInfo isn't provided, try to look up the current token
      const info = authInfo || (await this.client.tokenLookupSelf()).data;
      
      if (!info.renewable) {
        log.debug("Vault token is not renewable");
        return;
      }

      // Renew at 90% of the TTL
      const ttl = info.lease_duration;
      if (!ttl || ttl === 0) return; // Root tokens or non-expiring

      const renewalDelayMs = Math.max((ttl * 0.9) * 1000, 5000); // At least 5 seconds

      this.tokenRenewalTimer = setTimeout(async () => {
        try {
          await this.client.tokenRenewSelf();
          log.debug("Successfully renewed Vault token");
          await this.scheduleTokenRenewal(); // Schedule the next one
        } catch (err) {
          log.error("Failed to renew Vault token", { error: err });
          // If renewal fails, attempt to re-login via AppRole if configured
          if (this.config.appRole) {
             log.info("Attempting AppRole re-login due to failed token renewal");
             await this.loginWithAppRole();
          }
        }
      }, renewalDelayMs);

      // Prevent timer from keeping Node process alive
      if (this.tokenRenewalTimer.unref) {
        this.tokenRenewalTimer.unref();
      }
    } catch (error) {
      log.error("Failed to schedule Vault token renewal", { error });
    }
  }

  /**
   * Encrypt plaintext data using Transit Engine
   * @param options Encryption options
   * @returns Encrypted ciphertext and key version
   */
  async encrypt(options: EncryptOptions): Promise<EncryptResult> {
    try {
      const { keyName, plaintext, context, keyVersion, nonce, convergent } =
        options;

      // Base64 encode the plaintext
      const base64Plaintext = Buffer.from(plaintext).toString("base64");

      const payload: Record<string, unknown> = {
        plaintext: base64Plaintext,
      };

      if (context) payload.context = Buffer.from(context).toString("base64");
      if (keyVersion) payload.key_version = keyVersion;
      if (nonce) payload.nonce = nonce;
      if (convergent !== undefined) payload.convergent_encryption = convergent;

      const response = await this.client.write(
        `${this.transitMount}/encrypt/${keyName}`,
        payload,
      );

      const ciphertext = response.data.ciphertext as string;
      const version = response.data.key_version as number;

      log.debug("Encryption successful", { keyName, keyVersion: version });

      return {
        ciphertext,
        keyVersion: version,
      };
    } catch (error) {
      log.error("Encryption failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Decrypt ciphertext using Transit Engine
   * @param options Decryption options
   * @returns Decrypted plaintext
   */
  async decrypt(options: DecryptOptions): Promise<DecryptResult> {
    try {
      const { keyName, ciphertext, context, nonce } = options;

      const payload: Record<string, unknown> = {
        ciphertext,
      };

      if (context) payload.context = Buffer.from(context).toString("base64");
      if (nonce) payload.nonce = nonce;

      const response = await this.client.write(
        `${this.transitMount}/decrypt/${keyName}`,
        payload,
      );

      const base64Plaintext = response.data.plaintext as string;
      const plaintext = Buffer.from(base64Plaintext, "base64").toString(
        "utf-8",
      );

      log.debug("Decryption successful", { keyName });

      return { plaintext };
    } catch (error) {
      log.error("Decryption failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Batch encrypt multiple plaintext values
   * @param keyName The key to use for encryption
   * @param items Array of plaintext items to encrypt
   * @returns Array of encryption results
   */
  async batchEncrypt(
    keyName: string,
    items: Array<{ plaintext: string; context?: string }>,
  ): Promise<EncryptResult[]> {
    try {
      const batchInput = items.map((item) => ({
        plaintext: Buffer.from(item.plaintext).toString("base64"),
        context: item.context
          ? Buffer.from(item.context).toString("base64")
          : undefined,
      }));

      const response = await this.client.write(
        `${this.transitMount}/encrypt/${keyName}`,
        {
          batch_input: batchInput,
        },
      );

      const results = response.data.batch_results as Array<{
        ciphertext: string;
        key_version: number;
      }>;

      log.debug("Batch encryption successful", {
        keyName,
        count: items.length,
      });

      return results.map((r) => ({
        ciphertext: r.ciphertext,
        keyVersion: r.key_version,
      }));
    } catch (error) {
      log.error("Batch encryption failed", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Batch decrypt multiple ciphertext values
   * @param keyName The key to use for decryption
   * @param items Array of ciphertext items to decrypt
   * @returns Array of decryption results
   */
  async batchDecrypt(
    keyName: string,
    items: Array<{ ciphertext: string; context?: string }>,
  ): Promise<DecryptResult[]> {
    try {
      const batchInput = items.map((item) => ({
        ciphertext: item.ciphertext,
        context: item.context
          ? Buffer.from(item.context).toString("base64")
          : undefined,
      }));

      const response = await this.client.write(
        `${this.transitMount}/decrypt/${keyName}`,
        {
          batch_input: batchInput,
        },
      );

      const results = response.data.batch_results as Array<{
        plaintext: string;
      }>;

      log.debug("Batch decryption successful", {
        keyName,
        count: items.length,
      });

      return results.map((r) => ({
        plaintext: Buffer.from(r.plaintext, "base64").toString("utf-8"),
      }));
    } catch (error) {
      log.error("Batch decryption failed", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Rotate a Transit encryption key
   * @param keyName The name of the key to rotate
   * @returns Rotation result with new version number
   */
  async rotateKey(keyName: string): Promise<KeyRotationResult> {
    try {
      await this.client.write(
        `${this.transitMount}/keys/${keyName}/rotate`,
        {},
      );

      const keyInfo = await this.getKeyInfo(keyName);

      log.info("Key rotation successful", {
        keyName,
        newVersion: keyInfo.latestVersion,
      });

      return {
        success: true,
        newVersion: keyInfo.latestVersion,
      };
    } catch (error) {
      log.error("Key rotation failed", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Get information about a Transit key
   * @param keyName The name of the key
   * @returns Key information including versions
   */
  async getKeyInfo(keyName: string): Promise<KeyInfo> {
    try {
      const response = await this.client.read(
        `${this.transitMount}/keys/${keyName}`,
      );

      const data = response.data;

      return {
        name: keyName,
        type: data.type as string,
        latestVersion: data.latest_version as number,
        minDecryptionVersion: data.min_decryption_version as number,
        minEncryptionVersion: data.min_encryption_version as number,
        deletionAllowed: data.deletion_allowed as boolean,
        exportable: data.exportable as boolean,
        allowPlaintextBackup: data.allow_plaintext_backup as boolean,
        keys: data.keys as Record<string, KeyVersionInfo>,
      };
    } catch (error) {
      log.error("Failed to get key info", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Ensure the transit secrets engine is enabled
   */
  private async ensureTransitEnabled(): Promise<void> {
    try {
      // Check if already mounted
      const mounts = await this.client.mounts();
      if (mounts.data[this.transitMount + "/"]) {
        return; // already enabled
      }
    } catch (error) {
      // ignore errors during check
    }

    try {
      await this.client.write(`sys/mounts/${this.transitMount}`, {
        type: "transit",
      });
      log.info("Transit engine enabled", { mount: this.transitMount });
    } catch (error) {
      log.error("Failed to enable transit engine", { error });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Create a new Transit encryption key
   * @param keyName The name for the new key
   * @param options Key creation options
   */
  async createKey(keyName: string, options?: CreateKeyOptions): Promise<void> {
    // Ensure transit engine is enabled
    await this.ensureTransitEnabled();

    try {
      const payload: Record<string, unknown> = {};

      if (options?.convergentEncryption !== undefined) {
        payload.convergent_encryption = options.convergentEncryption;
      }
      if (options?.derived !== undefined) {
        payload.derived = options.derived;
      }
      if (options?.exportable !== undefined) {
        payload.exportable = options.exportable;
      }
      if (options?.allowPlaintextBackup !== undefined) {
        payload.allow_plaintext_backup = options.allowPlaintextBackup;
      }
      if (options?.type) {
        payload.type = options.type;
      }
      if (options?.autoRotatePeriod) {
        payload.auto_rotate_period = options.autoRotatePeriod;
      }

      await this.client.write(`${this.transitMount}/keys/${keyName}`, payload);

      log.info("Transit key created", { keyName, options });
    } catch (error) {
      log.error("Failed to create key", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Delete a Transit encryption key
   * @param keyName The name of the key to delete
   */
  async deleteKey(keyName: string): Promise<void> {
    try {
      // First, update the key to allow deletion
      await this.client.write(`${this.transitMount}/keys/${keyName}/config`, {
        deletion_allowed: true,
      });

      // Then delete the key
      await this.client.delete(`${this.transitMount}/keys/${keyName}`);

      log.info("Transit key deleted", { keyName });
    } catch (error) {
      log.error("Failed to delete key", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Rewrap ciphertext with the latest version of the key
   * Useful for key rotation without decrypting/re-encrypting on the client
   * @param options Rewrap options
   * @returns New ciphertext with updated key version
   */
  async rewrap(options: RewrapOptions): Promise<RewrapResult> {
    try {
      const { keyName, ciphertext, context, keyVersion, nonce } = options;

      const payload: Record<string, unknown> = {
        ciphertext,
      };

      if (context) payload.context = Buffer.from(context).toString("base64");
      if (keyVersion) payload.key_version = keyVersion;
      if (nonce) payload.nonce = nonce;

      const response = await this.client.write(
        `${this.transitMount}/rewrap/${keyName}`,
        payload,
      );

      log.debug("Rewrap successful", { keyName });

      return {
        ciphertext: response.data.ciphertext as string,
        keyVersion: response.data.key_version as number,
      };
    } catch (error) {
      log.error("Rewrap failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Generate a data key for envelope encryption
   * Returns both plaintext and encrypted versions of the key
   * @param options Data key generation options
   * @returns Generated data key (plaintext and ciphertext)
   */
  async generateDataKey(
    options: DataKeyGenerateOptions,
  ): Promise<DataKeyGenerateResult> {
    try {
      const { keyName, bits = 256, context, nonce } = options;

      const payload: Record<string, unknown> = {};

      if (bits) payload.bits = bits;
      if (context) payload.context = Buffer.from(context).toString("base64");
      if (nonce) payload.nonce = nonce;

      const response = await this.client.write(
        `${this.transitMount}/datakey/plaintext/${keyName}`,
        payload,
      );

      log.debug("Data key generated", { keyName, bits });

      return {
        plaintext: response.data.plaintext as string,
        ciphertext: response.data.ciphertext as string,
        keyVersion: response.data.key_version as number,
      };
    } catch (error) {
      log.error("Data key generation failed", {
        error,
        keyName: options.keyName,
      });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Generate a wrapped data key (encrypted only, no plaintext returned)
   * More secure alternative to generateDataKey
   * @param options Data key generation options
   * @returns Encrypted data key
   */
  async generateWrappedDataKey(
    options: DataKeyGenerateOptions,
  ): Promise<{ ciphertext: string; keyVersion: number }> {
    try {
      const { keyName, bits = 256, context, nonce } = options;

      const payload: Record<string, unknown> = {};

      if (bits) payload.bits = bits;
      if (context) payload.context = Buffer.from(context).toString("base64");
      if (nonce) payload.nonce = nonce;

      const response = await this.client.write(
        `${this.transitMount}/datakey/wrapped/${keyName}`,
        payload,
      );

      log.debug("Wrapped data key generated", { keyName, bits });

      return {
        ciphertext: response.data.ciphertext as string,
        keyVersion: response.data.key_version as number,
      };
    } catch (error) {
      log.error("Wrapped data key generation failed", {
        error,
        keyName: options.keyName,
      });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Sign data using a Transit key
   * @param options Signing options
   * @returns Signature
   */
  async sign(options: SignOptions): Promise<SignResult> {
    try {
      const {
        keyName,
        input,
        hashAlgorithm,
        signatureAlgorithm,
        prehashed,
        context,
      } = options;

      const payload: Record<string, unknown> = {
        input: Buffer.from(input).toString("base64"),
      };

      if (hashAlgorithm) payload.hash_algorithm = hashAlgorithm;
      if (signatureAlgorithm) payload.signature_algorithm = signatureAlgorithm;
      if (prehashed !== undefined) payload.prehashed = prehashed;
      if (context) payload.context = Buffer.from(context).toString("base64");

      const response = await this.client.write(
        `${this.transitMount}/sign/${keyName}`,
        payload,
      );

      log.debug("Signing successful", { keyName });

      return {
        signature: response.data.signature as string,
      };
    } catch (error) {
      log.error("Signing failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Verify a signature
   * @param options Verification options
   * @returns Verification result
   */
  async verify(options: VerifyOptions): Promise<VerifyResult> {
    try {
      const {
        keyName,
        input,
        signature,
        hashAlgorithm,
        signatureAlgorithm,
        prehashed,
        context,
      } = options;

      const payload: Record<string, unknown> = {
        input: Buffer.from(input).toString("base64"),
        signature,
      };

      if (hashAlgorithm) payload.hash_algorithm = hashAlgorithm;
      if (signatureAlgorithm) payload.signature_algorithm = signatureAlgorithm;
      if (prehashed !== undefined) payload.prehashed = prehashed;
      if (context) payload.context = Buffer.from(context).toString("base64");

      const response = await this.client.write(
        `${this.transitMount}/verify/${keyName}`,
        payload,
      );

      log.debug("Verification successful", {
        keyName,
        valid: response.data.valid,
      });

      return {
        valid: response.data.valid as boolean,
      };
    } catch (error) {
      log.error("Verification failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Check Vault health status
   * @returns Health status information
   */
  async checkHealth(): Promise<VaultHealth> {
    try {
      const response = await this.client.health();

      return {
        initialized: response.initialized,
        sealed: response.sealed,
        standby: response.standby,
        performanceStandby: response.performance_standby,
        replicationPerformanceMode: response.replication_performance_mode,
        replicationDrMode: response.replication_dr_mode,
        serverTimeUtc: response.server_time_utc,
        version: response.version,
        clusterName: response.cluster_name,
        clusterId: response.cluster_id,
      };
    } catch (error) {
      log.error("Health check failed", { error });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * List all Transit keys
   * @returns Array of key names
   */
  async listKeys(): Promise<string[]> {
    try {
      const response = await this.client.list(`${this.transitMount}/keys`);

      const keys = (response.data.keys as string[]) || [];

      log.debug("Keys listed", { count: keys.length });

      return keys;
    } catch (error) {
      log.error("Failed to list keys", { error });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Update Transit mount configuration
   * @param config Configuration options
   */
  async updateConfig(config: {
    maxVersions?: number;
    cacheTtl?: string;
  }): Promise<void> {
    try {
      const payload: Record<string, unknown> = {};

      if (config.maxVersions !== undefined) {
        payload.max_versions = config.maxVersions;
      }
      if (config.cacheTtl) {
        payload.cache_ttl = config.cacheTtl;
      }

      await this.client.write(`${this.transitMount}/config/keys`, payload);

      log.info("Transit config updated", config);
    } catch (error) {
      log.error("Failed to update config", { error });
      throw this.handleVaultError(error as VaultError);
    }
  }

  /**
   * Handle Vault errors and convert to standardized format
   * @param error Original error from Vault client
   * @returns Formatted error
   */
  private handleVaultError(error: VaultError): Error {
    const statusCode = error.response?.statusCode || error.statusCode;
    const message = error.message || "Unknown Vault error";

    const errorMessage = `Vault Error (${statusCode || "unknown"}): ${message}`;

    const vaultError = new Error(errorMessage) as VaultError;
    vaultError.statusCode = statusCode;
    vaultError.response = error.response;

    return vaultError;
  }

  /**
   * Test connection to Vault
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.checkHealth();
      log.info("Vault connection test successful");
      return true;
    } catch (error) {
      log.error("Vault connection test failed", { error });
      return false;
    }
  }
}

/**
 * Factory function to create a VaultService instance
 * @param config Vault configuration
 * @returns VaultService instance
 */
export function createVaultService(config: VaultConfig): VaultService {
  return new VaultService(config);
}
