import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Application Configuration
 * Centralized configuration management for the Hermes KMS API
 */

const config = {
  // Application
  app: {
    name: "Hermes KMS API",
    version: "1.0.0",
    env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "5001", 10),
    apiPrefix: process.env.API_PREFIX || "/api/v1",
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/hermes",
  },

  // HashiCorp Vault
  vault: {
    endpoint: process.env.VAULT_ENDPOINT || "http://localhost:8200",
    token: process.env.VAULT_TOKEN || "",
    namespace: process.env.VAULT_NAMESPACE || "", // Empty for root namespace
    transitMount: process.env.VAULT_TRANSIT_MOUNT || "transit",
    requestTimeout: parseInt(process.env.VAULT_REQUEST_TIMEOUT || "5000", 10),
    keyName: process.env.VAULT_KEY_NAME || "hermes-master-key",
    appRole: {
      readRoleId: process.env.VAULT_APPROLE_ROLE_ID_READ || "",
      readSecretId: process.env.VAULT_APPROLE_SECRET_ID_READ || "",
      writeRoleId: process.env.VAULT_APPROLE_ROLE_ID_WRITE || "",
      writeSecretId: process.env.VAULT_APPROLE_SECRET_ID_WRITE || "",
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
    issuer: process.env.JWT_ISSUER || "hermes-kms",
    audience: process.env.JWT_AUDIENCE || "hermes-api",
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || "900000", 10), // 15 minutes
    sessionDuration: parseInt(process.env.SESSION_DURATION || "604800000", 10), // 7 days
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "12", 10),
    mfaIssuer: process.env.MFA_ISSUER || "Hermes KMS",
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
    from: process.env.EMAIL_FROM || "noreply@hermes-kms.com",
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
  if (!config.vault.token) {
    throw new Error("VAULT_TOKEN must be set in production!");
  }
  if (!config.database.url.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL must be properly configured in production!");
  }
}

export default config;
