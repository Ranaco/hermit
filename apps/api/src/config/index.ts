import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const readEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

/**
 * Application Configuration
 * Centralized configuration management for the Hermit KMS API
 */

const config = {
  // Application
  app: {
    name: "Hermit KMS API",
    version: "1.0.0",
    env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "5001", 10),
    apiPrefix: process.env.API_PREFIX || "/api/v1",
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/hermit",
  },

  // HashiCorp Vault
  vault: {
    endpoint: readEnv("VAULT_ENDPOINT") || "http://localhost:8200",
    token: readEnv("VAULT_TOKEN") || "",
    namespace: readEnv("VAULT_NAMESPACE") || "", // Empty for root namespace
    transitMount: readEnv("VAULT_TRANSIT_MOUNT") || "transit",
    requestTimeout: parseInt(process.env.VAULT_REQUEST_TIMEOUT || "5000", 10),
    keyName: process.env.VAULT_KEY_NAME || "hermit-master-key",
    appRole: {
      readRoleId: readEnv("VAULT_APPROLE_ROLE_ID_READ") || "",
      readSecretId: readEnv("VAULT_APPROLE_SECRET_ID_READ") || "",
      writeRoleId: readEnv("VAULT_APPROLE_ROLE_ID_WRITE") || "",
      writeSecretId: readEnv("VAULT_APPROLE_SECRET_ID_WRITE") || "",
    },
  },

  // JWT Authentication
  jwt: {
    accessTokenSecret:
      process.env.JWT_ACCESS_SECRET || "your-access-token-secret-change-this",
    refreshTokenSecret:
      process.env.JWT_REFRESH_SECRET || "your-refresh-token-secret-change-this",
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
    issuer: process.env.JWT_ISSUER || "hermit-kms",
    audience: process.env.JWT_AUDIENCE || "hermit-api",
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || "900000", 10), // 15 minutes
    sessionDuration: parseInt(process.env.SESSION_DURATION || "604800000", 10), // 7 days
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "12", 10),
    mfaIssuer: process.env.MFA_ISSUER || "Hermit KMS",
    trustedProxies: process.env.TRUSTED_PROXIES?.split(",") || [],
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    authWindowMs: parseInt(
      process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000",
      10,
    ),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "5", 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000", "http://localhost:5001"],
    credentials: true,
    optionsSuccessStatus: 200,
  },

  // Logging
  logging: {
    level:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    format: process.env.LOG_FORMAT || "json",
  },

  // Email (for future implementation)
  email: {
    from: process.env.EMAIL_FROM || "noreply@hermit-kms.com",
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    },
  },

  // Features
  features: {
    enableRegistration: process.env.ENABLE_REGISTRATION !== "false",
    enableMfa: process.env.ENABLE_MFA !== "false",
    enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION === "true",
    enableAuditLog: process.env.ENABLE_AUDIT_LOG !== "false",
    enableSwagger: process.env.ENABLE_SWAGGER !== "false",
  },

  // Temporary Shares
  shares: {
    defaultExpiry: parseInt(process.env.SHARE_DEFAULT_EXPIRY || "3600000", 10), // 1 hour
    maxExpiry: parseInt(process.env.SHARE_MAX_EXPIRY || "2592000000", 10), // 30 days
    maxRedemptionAttempts: parseInt(process.env.SHARE_MAX_ATTEMPTS || "3", 10),
  },
} as const;

// Validation
if (config.app.env === "production") {
  if (config.jwt.accessTokenSecret.includes("change-this")) {
    throw new Error("JWT secrets must be changed in production!");
  }
  const hasVaultToken = Boolean(config.vault.token);
  const hasVaultWriteAppRole = Boolean(
    config.vault.appRole.writeRoleId && config.vault.appRole.writeSecretId,
  );
  if (!hasVaultToken && !hasVaultWriteAppRole) {
    throw new Error("Vault authentication must be configured with either VAULT_TOKEN or write AppRole credentials in production!");
  }
  if (!config.database.url.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL must be properly configured in production!");
  }
}

export default config;
