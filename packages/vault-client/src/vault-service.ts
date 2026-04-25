import vault from "node-vault";
import { log } from "./logger";
import { validateVaultConfig } from "./config-validation";
import type { ValidatedVaultConfig } from "./config-validation";
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

export class VaultService {
  private client: vault.client;
  private transitMount: string;
  private config: ValidatedVaultConfig;
  private tokenRenewalTimer?: NodeJS.Timeout;
  private initialized = false;
  private resolvedSecretId?: string;

  constructor(config: VaultConfig) {
    this.config = validateVaultConfig(config);
    this.transitMount = this.config.transitMount || "transit";

    this.client = this.createClient({ token: this.config.token });

    log.info("VaultService initialized", {
      endpoint: this.config.endpoint,
      transitMount: this.transitMount,
      namespace: this.config.namespace,
    });
  }

  private createClient(options?: { token?: string }): vault.client {
    type ExtendedVaultOptions = NonNullable<Parameters<typeof vault>[0]> & {
      rpDefaults?: {
        strictSSL: boolean;
      };
    };

    const clientConfig: ExtendedVaultOptions = {
      apiVersion: "v1",
      endpoint: this.config.endpoint,
      token: options?.token,
      namespace: this.config.namespace,
      requestOptions: {
        timeout: this.config.requestTimeout || 5000,
      },
      rpDefaults: {
        strictSSL: !this.config.skipVerify,
      },
    };

    return vault(clientConfig);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!this.config.token && this.config.appRole) {
      await this.loginWithAppRole();
    } else if (this.config.token) {
      await this.scheduleTokenRenewal();
    }

    this.initialized = true;
  }

  private async resolveAppRoleSecretId(): Promise<string> {
    if (!this.config.appRole) {
      throw new Error("AppRole configuration missing");
    }

    if (this.resolvedSecretId) {
      return this.resolvedSecretId;
    }

    if (this.config.appRole.wrappedSecretId) {
      const unwrapClient = this.createClient({
        token: this.config.appRole.wrappedSecretId,
      });

      const unwrapResponse = await unwrapClient.write("sys/wrapping/unwrap", {});
      const secretId = unwrapResponse?.data?.secret_id as string | undefined;
      if (!secretId) {
        throw new Error("Wrapped SecretID unwrap did not return a secret_id");
      }

      this.resolvedSecretId = secretId;
      return secretId;
    }

    if (this.config.appRole.secretId) {
      this.resolvedSecretId = this.config.appRole.secretId;
      return this.resolvedSecretId;
    }

    if (!this.config.appRole.wrappedSecretId) {
      throw new Error("AppRole secret material is missing");
    }

    throw new Error("AppRole secret material is missing");
  }

  private async loginWithAppRole(): Promise<void> {
    if (!this.config.appRole) {
      throw new Error("AppRole configuration missing");
    }

    try {
      const { roleId, mountPoint = "approle" } = this.config.appRole;
      const secretId = await this.resolveAppRoleSecretId();

      const response = await this.client.write(`auth/${mountPoint}/login`, {
        role_id: roleId,
        secret_id: secretId,
      });

      this.client = this.createClient({ token: response.auth.client_token });

      log.info("Successfully authenticated with Vault via AppRole");
      await this.scheduleTokenRenewal(response.auth);
    } catch (error: any) {
      if (error?.code === "ECONNREFUSED" || error?.message?.includes("ECONNREFUSED")) {
        log.error("Vault connection refused during AppRole login");
      } else {
        log.error("Vault AppRole login failed", { error });
      }

      if (this.tokenRenewalTimer) {
        clearTimeout(this.tokenRenewalTimer);
      }

      this.tokenRenewalTimer = setTimeout(async () => {
        log.info("Retrying Vault AppRole login after previous failure...");
        await this.loginWithAppRole();
      }, 30_000);

      if (this.tokenRenewalTimer.unref) {
        this.tokenRenewalTimer.unref();
      }
    }
  }

  private async scheduleTokenRenewal(authInfo?: any): Promise<void> {
    if (this.tokenRenewalTimer) {
      clearTimeout(this.tokenRenewalTimer);
    }

    try {
      const info = authInfo || (await this.client.tokenLookupSelf()).data;

      if (!info.renewable) {
        log.debug("Vault token is not renewable");
        return;
      }

      const ttl = info.lease_duration;
      if (!ttl || ttl === 0) {
        return;
      }

      const renewalDelayMs = Math.max(ttl * 0.9 * 1000, 5000);

      this.tokenRenewalTimer = setTimeout(async () => {
        try {
          await this.client.tokenRenewSelf();
          log.debug("Successfully renewed Vault token");
          await this.scheduleTokenRenewal();
        } catch (err) {
          log.error("Failed to renew Vault token", { error: err });
          if (this.config.appRole) {
            log.info("Attempting AppRole re-login due to failed token renewal");
            await this.loginWithAppRole();
          }
        }
      }, renewalDelayMs);

      if (this.tokenRenewalTimer.unref) {
        this.tokenRenewalTimer.unref();
      }
    } catch (error) {
      log.error("Failed to schedule Vault token renewal", { error });
    }
  }

  async encrypt(options: EncryptOptions): Promise<EncryptResult> {
    try {
      const { keyName, plaintext, context, keyVersion, nonce, convergent } = options;
      const payload: Record<string, unknown> = {
        plaintext: Buffer.from(plaintext).toString("base64"),
      };

      if (context) payload.context = Buffer.from(context).toString("base64");
      if (keyVersion) payload.key_version = keyVersion;
      if (nonce) payload.nonce = nonce;
      if (convergent !== undefined) payload.convergent_encryption = convergent;

      const response = await this.client.write(`${this.transitMount}/encrypt/${keyName}`, payload);
      return {
        ciphertext: response.data.ciphertext as string,
        keyVersion: response.data.key_version as number,
      };
    } catch (error) {
      log.error("Encryption failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async decrypt(options: DecryptOptions): Promise<DecryptResult> {
    try {
      const { keyName, ciphertext, context, nonce } = options;
      const payload: Record<string, unknown> = { ciphertext };

      if (context) payload.context = Buffer.from(context).toString("base64");
      if (nonce) payload.nonce = nonce;

      const response = await this.client.write(`${this.transitMount}/decrypt/${keyName}`, payload);
      return {
        plaintext: Buffer.from(response.data.plaintext as string, "base64").toString("utf-8"),
      };
    } catch (error) {
      log.error("Decryption failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async batchEncrypt(
    keyName: string,
    items: Array<{ plaintext: string; context?: string }>,
  ): Promise<EncryptResult[]> {
    try {
      const batchInput = items.map((item) => ({
        plaintext: Buffer.from(item.plaintext).toString("base64"),
        context: item.context ? Buffer.from(item.context).toString("base64") : undefined,
      }));

      const response = await this.client.write(`${this.transitMount}/encrypt/${keyName}`, {
        batch_input: batchInput,
      });

      return (response.data.batch_results as Array<{ ciphertext: string; key_version: number }>).map((result) => ({
        ciphertext: result.ciphertext,
        keyVersion: result.key_version,
      }));
    } catch (error) {
      log.error("Batch encryption failed", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async batchDecrypt(
    keyName: string,
    items: Array<{ ciphertext: string; context?: string }>,
  ): Promise<DecryptResult[]> {
    try {
      const batchInput = items.map((item) => ({
        ciphertext: item.ciphertext,
        context: item.context ? Buffer.from(item.context).toString("base64") : undefined,
      }));

      const response = await this.client.write(`${this.transitMount}/decrypt/${keyName}`, {
        batch_input: batchInput,
      });

      return (response.data.batch_results as Array<{ plaintext: string }>).map((result) => ({
        plaintext: Buffer.from(result.plaintext, "base64").toString("utf-8"),
      }));
    } catch (error) {
      log.error("Batch decryption failed", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async rotateKey(keyName: string): Promise<KeyRotationResult> {
    try {
      await this.client.write(`${this.transitMount}/keys/${keyName}/rotate`, {});
      const keyInfo = await this.getKeyInfo(keyName);
      return { success: true, newVersion: keyInfo.latestVersion };
    } catch (error) {
      log.error("Key rotation failed", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async getKeyInfo(keyName: string): Promise<KeyInfo> {
    try {
      const response = await this.client.read(`${this.transitMount}/keys/${keyName}`);
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

  private async ensureTransitEnabled(): Promise<void> {
    try {
      const mounts = await this.client.mounts();
      if (mounts.data[`${this.transitMount}/`]) {
        return;
      }
    } catch {
      // Best-effort mount check only.
    }

    try {
      await this.client.write(`sys/mounts/${this.transitMount}`, { type: "transit" });
      log.info("Transit engine enabled", { mount: this.transitMount });
    } catch (error: any) {
      if (error?.response?.statusCode === 403) {
        const errors: string[] = error?.response?.body?.errors || [];
        if (errors.some((entry: string) => entry.includes("invalid token"))) {
          throw error;
        }
        log.warn("403 enabling transit; assuming admin already configured it", {
          mount: this.transitMount,
        });
        return;
      }
      if (
        error?.response?.statusCode === 400 &&
        error?.response?.body?.errors?.some((entry: string) => entry.includes("already in use"))
      ) {
        log.info("Transit engine already enabled", { mount: this.transitMount });
        return;
      }
      log.error("Failed to enable transit engine", { error });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async createKey(keyName: string, options?: CreateKeyOptions): Promise<void> {
    await this.ensureTransitEnabled();

    try {
      const payload: Record<string, unknown> = {};
      if (options?.convergentEncryption !== undefined) payload.convergent_encryption = options.convergentEncryption;
      if (options?.derived !== undefined) payload.derived = options.derived;
      if (options?.exportable !== undefined) payload.exportable = options.exportable;
      if (options?.allowPlaintextBackup !== undefined) payload.allow_plaintext_backup = options.allowPlaintextBackup;
      if (options?.type) payload.type = options.type;
      if (options?.autoRotatePeriod) payload.auto_rotate_period = options.autoRotatePeriod;

      await this.client.write(`${this.transitMount}/keys/${keyName}`, payload);
      log.info("Transit key created", { keyName, options });
    } catch (error) {
      log.error("Failed to create key", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async deleteKey(keyName: string): Promise<void> {
    try {
      await this.client.write(`${this.transitMount}/keys/${keyName}/config`, {
        deletion_allowed: true,
      });
      await this.client.delete(`${this.transitMount}/keys/${keyName}`);
      log.info("Transit key deleted", { keyName });
    } catch (error) {
      log.error("Failed to delete key", { error, keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async rewrap(options: RewrapOptions): Promise<RewrapResult> {
    try {
      const { keyName, ciphertext, context, keyVersion, nonce } = options;
      const payload: Record<string, unknown> = { ciphertext };

      if (context) payload.context = Buffer.from(context).toString("base64");
      if (keyVersion) payload.key_version = keyVersion;
      if (nonce) payload.nonce = nonce;

      const response = await this.client.write(`${this.transitMount}/rewrap/${keyName}`, payload);
      return {
        ciphertext: response.data.ciphertext as string,
        keyVersion: response.data.key_version as number,
      };
    } catch (error) {
      log.error("Rewrap failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async generateDataKey(options: DataKeyGenerateOptions): Promise<DataKeyGenerateResult> {
    try {
      const { keyName, bits = 256, context, nonce } = options;
      const payload: Record<string, unknown> = {};

      if (bits) payload.bits = bits;
      if (context) payload.context = Buffer.from(context).toString("base64");
      if (nonce) payload.nonce = nonce;

      const response = await this.client.write(`${this.transitMount}/datakey/plaintext/${keyName}`, payload);
      return {
        plaintext: response.data.plaintext as string,
        ciphertext: response.data.ciphertext as string,
        keyVersion: response.data.key_version as number,
      };
    } catch (error) {
      log.error("Data key generation failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async generateWrappedDataKey(
    options: DataKeyGenerateOptions,
  ): Promise<{ ciphertext: string; keyVersion: number }> {
    try {
      const { keyName, bits = 256, context, nonce } = options;
      const payload: Record<string, unknown> = {};

      if (bits) payload.bits = bits;
      if (context) payload.context = Buffer.from(context).toString("base64");
      if (nonce) payload.nonce = nonce;

      const response = await this.client.write(`${this.transitMount}/datakey/wrapped/${keyName}`, payload);
      return {
        ciphertext: response.data.ciphertext as string,
        keyVersion: response.data.key_version as number,
      };
    } catch (error) {
      log.error("Wrapped data key generation failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async sign(options: SignOptions): Promise<SignResult> {
    try {
      const { keyName, input, hashAlgorithm, signatureAlgorithm, prehashed, context } = options;
      const payload: Record<string, unknown> = {
        input: Buffer.from(input).toString("base64"),
      };

      if (hashAlgorithm) payload.hash_algorithm = hashAlgorithm;
      if (signatureAlgorithm) payload.signature_algorithm = signatureAlgorithm;
      if (prehashed !== undefined) payload.prehashed = prehashed;
      if (context) payload.context = Buffer.from(context).toString("base64");

      const response = await this.client.write(`${this.transitMount}/sign/${keyName}`, payload);
      return { signature: response.data.signature as string };
    } catch (error) {
      log.error("Signing failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async verify(options: VerifyOptions): Promise<VerifyResult> {
    try {
      const { keyName, input, signature, hashAlgorithm, signatureAlgorithm, prehashed, context } = options;
      const payload: Record<string, unknown> = {
        input: Buffer.from(input).toString("base64"),
        signature,
      };

      if (hashAlgorithm) payload.hash_algorithm = hashAlgorithm;
      if (signatureAlgorithm) payload.signature_algorithm = signatureAlgorithm;
      if (prehashed !== undefined) payload.prehashed = prehashed;
      if (context) payload.context = Buffer.from(context).toString("base64");

      const response = await this.client.write(`${this.transitMount}/verify/${keyName}`, payload);
      return { valid: response.data.valid as boolean };
    } catch (error) {
      log.error("Verification failed", { error, keyName: options.keyName });
      throw this.handleVaultError(error as VaultError);
    }
  }

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

  async listKeys(): Promise<string[]> {
    try {
      const response = await this.client.list(`${this.transitMount}/keys`);
      return (response.data.keys as string[]) || [];
    } catch (error) {
      log.error("Failed to list keys", { error });
      throw this.handleVaultError(error as VaultError);
    }
  }

  async updateConfig(config: { maxVersions?: number; cacheTtl?: string }): Promise<void> {
    try {
      const payload: Record<string, unknown> = {};
      if (config.maxVersions !== undefined) payload.max_versions = config.maxVersions;
      if (config.cacheTtl) payload.cache_ttl = config.cacheTtl;
      await this.client.write(`${this.transitMount}/config/keys`, payload);
      log.info("Transit config updated", config);
    } catch (error) {
      log.error("Failed to update config", { error });
      throw this.handleVaultError(error as VaultError);
    }
  }

  private handleVaultError(error: VaultError): Error {
    const statusCode = error.response?.statusCode || error.statusCode;
    const message = error.message || "Unknown Vault error";

    if (statusCode === 403 && this.config.appRole) {
      const errors: string[] = error.response?.body?.errors || [];
      if (errors.some((entry) => entry.includes("invalid token"))) {
        log.info("Invalid Vault token detected, triggering AppRole re-login...");
        this.loginWithAppRole().catch((reloginError) =>
          log.error("AppRole re-login failed after invalid token", { error: reloginError }),
        );
      }
    }

    const vaultError = new Error(`Vault Error (${statusCode || "unknown"}): ${message}`) as VaultError;
    vaultError.statusCode = statusCode;
    vaultError.response = error.response;
    return vaultError;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      await this.checkHealth();

      if (this.config.token || this.config.appRole) {
        await this.client.tokenLookupSelf();
        await this.listKeys();
      }

      log.info("Vault connection test successful");
      return true;
    } catch (error) {
      log.error("Vault connection test failed", { error });
      return false;
    }
  }
}

export function createVaultService(config: VaultConfig): VaultService {
  return new VaultService(config);
}
