/**
 * Standardized Error Codes for Hermit KMS
 */

export enum ErrorCode {
  // Authentication & Authorization (1000-1999)
  UNAUTHORIZED = 'AUTH_1001',
  INVALID_CREDENTIALS = 'AUTH_1002',
  TOKEN_EXPIRED = 'AUTH_1003',
  TOKEN_INVALID = 'AUTH_1004',
  INSUFFICIENT_PERMISSIONS = 'AUTH_1005',
  ACCOUNT_LOCKED = 'AUTH_1006',
  MFA_REQUIRED = 'AUTH_1007',
  MFA_INVALID = 'AUTH_1008',
  SESSION_EXPIRED = 'AUTH_1009',
  SESSION_INVALID = 'AUTH_1010',
  DEVICE_NOT_TRUSTED = 'AUTH_1011',
  
  // User Management (2000-2999)
  USER_NOT_FOUND = 'USER_2001',
  USER_ALREADY_EXISTS = 'USER_2002',
  USER_INACTIVE = 'USER_2003',
  EMAIL_NOT_VERIFIED = 'USER_2004',
  INVALID_EMAIL = 'USER_2005',
  WEAK_PASSWORD = 'USER_2006',
  PASSWORD_MISMATCH = 'USER_2007',
  
  // Organization Management (3000-3999)
  ORGANIZATION_NOT_FOUND = 'ORG_3001',
  ORGANIZATION_ALREADY_EXISTS = 'ORG_3002',
  NOT_ORGANIZATION_MEMBER = 'ORG_3003',
  INVITATION_INVALID = 'ORG_3004',
  INVITATION_EXPIRED = 'ORG_3005',
  
  // Vault Management (4000-4999)
  VAULT_NOT_FOUND = 'VAULT_4001',
  VAULT_ALREADY_EXISTS = 'VAULT_4002',
  VAULT_ACCESS_DENIED = 'VAULT_4003',
  
  // Key Management (5000-5999)
  KEY_NOT_FOUND = 'KEY_5001',
  KEY_ALREADY_EXISTS = 'KEY_5002',
  KEY_VERSION_NOT_FOUND = 'KEY_5003',
  KEY_ROTATION_FAILED = 'KEY_5004',
  KEY_ENCRYPTION_FAILED = 'KEY_5005',
  KEY_DECRYPTION_FAILED = 'KEY_5006',
  KEY_ACCESS_DENIED = 'KEY_5007',
  INVALID_KEY_TYPE = 'KEY_5008',
  
  // Sharing & Permissions (6000-6999)
  SHARE_NOT_FOUND = 'SHARE_6001',
  SHARE_EXPIRED = 'SHARE_6002',
  SHARE_ALREADY_CONSUMED = 'SHARE_6003',
  SHARE_INVALID_PASSPHRASE = 'SHARE_6004',
  TEMPORARY_KEY_NOT_FOUND = 'SHARE_6005',
  TEMPORARY_KEY_EXPIRED = 'SHARE_6006',
  PERMISSION_DENIED = 'SHARE_6007',
  RESOURCE_NOT_FOUND = 'SHARE_6008',
  RESOURCE_EXPIRED = 'SHARE_6009',
  
  // Vault Integration (7000-7999)
  VAULT_CONNECTION_FAILED = 'HVAULT_7001',
  VAULT_TRANSIT_ERROR = 'HVAULT_7002',
  VAULT_KEY_NOT_FOUND = 'HVAULT_7003',
  VAULT_UNSEALED = 'HVAULT_7004',
  VAULT_UNAVAILABLE = 'HVAULT_7005',
  
  // Validation (8000-8999)
  VALIDATION_ERROR = 'VAL_8001',
  INVALID_INPUT = 'VAL_8002',
  MISSING_REQUIRED_FIELD = 'VAL_8003',
  INVALID_FORMAT = 'VAL_8004',
  
  // Rate Limiting (9000-9999)
  RATE_LIMIT_EXCEEDED = 'RATE_9001',
  TOO_MANY_REQUESTS = 'RATE_9002',
  
  // System Errors (10000+)
  INTERNAL_SERVER_ERROR = 'SYS_10001',
  DATABASE_ERROR = 'SYS_10002',
  EXTERNAL_SERVICE_ERROR = 'SYS_10003',
  NOT_IMPLEMENTED = 'SYS_10004',
  MAINTENANCE_MODE = 'SYS_10005',
}

export const ErrorMessages: Record<ErrorCode, string> = {
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: 'Authentication required',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCode.TOKEN_EXPIRED]: 'Authentication token has expired',
  [ErrorCode.TOKEN_INVALID]: 'Invalid authentication token',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions to perform this action',
  [ErrorCode.ACCOUNT_LOCKED]: 'Account is locked due to multiple failed login attempts',
  [ErrorCode.MFA_REQUIRED]: 'Multi-factor authentication is required',
  [ErrorCode.MFA_INVALID]: 'Invalid MFA code',
  [ErrorCode.SESSION_EXPIRED]: 'Session has expired',
  [ErrorCode.SESSION_INVALID]: 'Invalid session',
  [ErrorCode.DEVICE_NOT_TRUSTED]: 'Device is not trusted',
  
  // User Management
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
  [ErrorCode.USER_INACTIVE]: 'User account is inactive',
  [ErrorCode.EMAIL_NOT_VERIFIED]: 'Email address is not verified',
  [ErrorCode.INVALID_EMAIL]: 'Invalid email address',
  [ErrorCode.WEAK_PASSWORD]: 'Password does not meet security requirements',
  [ErrorCode.PASSWORD_MISMATCH]: 'Passwords do not match',
  
  // Organization Management
  [ErrorCode.ORGANIZATION_NOT_FOUND]: 'Organization not found',
  [ErrorCode.ORGANIZATION_ALREADY_EXISTS]: 'Organization already exists',
  [ErrorCode.NOT_ORGANIZATION_MEMBER]: 'You are not a member of this organization',
  [ErrorCode.INVITATION_INVALID]: 'Invalid invitation',
  [ErrorCode.INVITATION_EXPIRED]: 'Invitation has expired',
  
  // Vault Management
  [ErrorCode.VAULT_NOT_FOUND]: 'Vault not found',
  [ErrorCode.VAULT_ALREADY_EXISTS]: 'Vault already exists',
  [ErrorCode.VAULT_ACCESS_DENIED]: 'Access to vault denied',
  
  // Key Management
  [ErrorCode.KEY_NOT_FOUND]: 'Key not found',
  [ErrorCode.KEY_ALREADY_EXISTS]: 'Key already exists',
  [ErrorCode.KEY_VERSION_NOT_FOUND]: 'Key version not found',
  [ErrorCode.KEY_ROTATION_FAILED]: 'Key rotation failed',
  [ErrorCode.KEY_ENCRYPTION_FAILED]: 'Key encryption failed',
  [ErrorCode.KEY_DECRYPTION_FAILED]: 'Key decryption failed',
  [ErrorCode.KEY_ACCESS_DENIED]: 'Access to key denied',
  [ErrorCode.INVALID_KEY_TYPE]: 'Invalid key type',
  
  // Sharing & Permissions
  [ErrorCode.SHARE_NOT_FOUND]: 'Share not found',
  [ErrorCode.SHARE_EXPIRED]: 'Share has expired',
  [ErrorCode.SHARE_ALREADY_CONSUMED]: 'Share has already been consumed',
  [ErrorCode.SHARE_INVALID_PASSPHRASE]: 'Invalid passphrase',
  [ErrorCode.TEMPORARY_KEY_NOT_FOUND]: 'Temporary key not found',
  [ErrorCode.TEMPORARY_KEY_EXPIRED]: 'Temporary key has expired',
  [ErrorCode.PERMISSION_DENIED]: 'Permission denied',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ErrorCode.RESOURCE_EXPIRED]: 'Resource has expired',
  
  // Vault Integration
  [ErrorCode.VAULT_CONNECTION_FAILED]: 'Failed to connect to Vault',
  [ErrorCode.VAULT_TRANSIT_ERROR]: 'Vault Transit Engine error',
  [ErrorCode.VAULT_KEY_NOT_FOUND]: 'Vault key not found',
  [ErrorCode.VAULT_UNSEALED]: 'Vault is sealed',
  [ErrorCode.VAULT_UNAVAILABLE]: 'Vault is unavailable',
  
  // Validation
  [ErrorCode.VALIDATION_ERROR]: 'Validation error',
  [ErrorCode.INVALID_INPUT]: 'Invalid input',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Missing required field',
  [ErrorCode.INVALID_FORMAT]: 'Invalid format',
  
  // Rate Limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  [ErrorCode.TOO_MANY_REQUESTS]: 'Too many requests',
  
  // System Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ErrorCode.DATABASE_ERROR]: 'Database error',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error',
  [ErrorCode.NOT_IMPLEMENTED]: 'Feature not implemented',
  [ErrorCode.MAINTENANCE_MODE]: 'System is currently under maintenance',
};

export const HttpStatusCodes: Record<ErrorCode, number> = {
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.ACCOUNT_LOCKED]: 423,
  [ErrorCode.MFA_REQUIRED]: 401,
  [ErrorCode.MFA_INVALID]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,
  [ErrorCode.SESSION_INVALID]: 401,
  [ErrorCode.DEVICE_NOT_TRUSTED]: 403,
  
  // User Management
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.USER_ALREADY_EXISTS]: 409,
  [ErrorCode.USER_INACTIVE]: 403,
  [ErrorCode.EMAIL_NOT_VERIFIED]: 403,
  [ErrorCode.INVALID_EMAIL]: 400,
  [ErrorCode.WEAK_PASSWORD]: 400,
  [ErrorCode.PASSWORD_MISMATCH]: 400,
  
  // Organization Management
  [ErrorCode.ORGANIZATION_NOT_FOUND]: 404,
  [ErrorCode.ORGANIZATION_ALREADY_EXISTS]: 409,
  [ErrorCode.NOT_ORGANIZATION_MEMBER]: 403,
  [ErrorCode.INVITATION_INVALID]: 400,
  [ErrorCode.INVITATION_EXPIRED]: 410,
  
  // Vault Management
  [ErrorCode.VAULT_NOT_FOUND]: 404,
  [ErrorCode.VAULT_ALREADY_EXISTS]: 409,
  [ErrorCode.VAULT_ACCESS_DENIED]: 403,
  
  // Key Management
  [ErrorCode.KEY_NOT_FOUND]: 404,
  [ErrorCode.KEY_ALREADY_EXISTS]: 409,
  [ErrorCode.KEY_VERSION_NOT_FOUND]: 404,
  [ErrorCode.KEY_ROTATION_FAILED]: 500,
  [ErrorCode.KEY_ENCRYPTION_FAILED]: 500,
  [ErrorCode.KEY_DECRYPTION_FAILED]: 500,
  [ErrorCode.KEY_ACCESS_DENIED]: 403,
  [ErrorCode.INVALID_KEY_TYPE]: 400,
  
  // Sharing & Permissions
  [ErrorCode.SHARE_NOT_FOUND]: 404,
  [ErrorCode.SHARE_EXPIRED]: 410,
  [ErrorCode.SHARE_ALREADY_CONSUMED]: 410,
  [ErrorCode.SHARE_INVALID_PASSPHRASE]: 401,
  [ErrorCode.TEMPORARY_KEY_NOT_FOUND]: 404,
  [ErrorCode.TEMPORARY_KEY_EXPIRED]: 410,
  [ErrorCode.PERMISSION_DENIED]: 403,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_EXPIRED]: 410,
  
  // Vault Integration
  [ErrorCode.VAULT_CONNECTION_FAILED]: 503,
  [ErrorCode.VAULT_TRANSIT_ERROR]: 500,
  [ErrorCode.VAULT_KEY_NOT_FOUND]: 404,
  [ErrorCode.VAULT_UNSEALED]: 503,
  [ErrorCode.VAULT_UNAVAILABLE]: 503,
  
  // Validation
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  
  // Rate Limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,
  
  // System Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.NOT_IMPLEMENTED]: 501,
  [ErrorCode.MAINTENANCE_MODE]: 503,
};
