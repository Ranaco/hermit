
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
} = require('./runtime/index-browser')


const Prisma = {}

exports.Prisma = Prisma

/**
 * Prisma Client JS version: 4.16.2
 * Query Engine version: 4bc8b6e1b66cb932731fb1bdbbc550d1e010de81
 */
Prisma.prismaVersion = {
  client: "4.16.2",
  engine: "4bc8b6e1b66cb932731fb1bdbbc550d1e010de81"
}

Prisma.PrismaClientKnownRequestError = () => {
  throw new Error(`PrismaClientKnownRequestError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  throw new Error(`PrismaClientUnknownRequestError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientRustPanicError = () => {
  throw new Error(`PrismaClientRustPanicError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientInitializationError = () => {
  throw new Error(`PrismaClientInitializationError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientValidationError = () => {
  throw new Error(`PrismaClientValidationError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.NotFoundError = () => {
  throw new Error(`NotFoundError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  throw new Error(`sqltag is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.empty = () => {
  throw new Error(`empty is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.join = () => {
  throw new Error(`join is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.raw = () => {
  throw new Error(`raw is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  throw new Error(`Extensions.getExtensionContext is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.defineExtension = () => {
  throw new Error(`Extensions.defineExtension is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  username: 'username',
  passwordHash: 'passwordHash',
  firstName: 'firstName',
  lastName: 'lastName',
  isActive: 'isActive',
  isEmailVerified: 'isEmailVerified',
  isLocked: 'isLocked',
  lockedUntil: 'lockedUntil',
  consecutiveFailedLogins: 'consecutiveFailedLogins',
  lastLoginAt: 'lastLoginAt',
  isTwoFactorEnabled: 'isTwoFactorEnabled',
  twoFactorSecret: 'twoFactorSecret',
  twoFactorMethod: 'twoFactorMethod',
  backupCodes: 'backupCodes',
  requiresMfaForSensitiveOps: 'requiresMfaForSensitiveOps',
  passwordChangedAt: 'passwordChangedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  publicKey: 'publicKey',
  encryptedPrivateKey: 'encryptedPrivateKey',
  kdfParams: 'kdfParams'
};

exports.Prisma.DeviceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  fingerprint: 'fingerprint',
  lastUsedAt: 'lastUsedAt',
  isTrusted: 'isTrusted',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  createdAt: 'createdAt'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  deviceId: 'deviceId',
  refreshToken: 'refreshToken',
  expiresAt: 'expiresAt',
  isValid: 'isValid',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastUsedAt: 'lastUsedAt'
};

exports.Prisma.PasswordResetScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  expiresAt: 'expiresAt',
  isUsed: 'isUsed',
  createdAt: 'createdAt',
  usedAt: 'usedAt',
  ipRequested: 'ipRequested',
  ipUsed: 'ipUsed'
};

exports.Prisma.EmailVerificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  email: 'email',
  token: 'token',
  expiresAt: 'expiresAt',
  isVerified: 'isVerified',
  createdAt: 'createdAt',
  verifiedAt: 'verifiedAt'
};

exports.Prisma.LoginAttemptScalarFieldEnum = {
  id: 'id',
  email: 'email',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  success: 'success',
  failureReason: 'failureReason',
  deviceFingerprint: 'deviceFingerprint',
  createdAt: 'createdAt',
  userId: 'userId'
};

exports.Prisma.MfaRecoveryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  code: 'code',
  isUsed: 'isUsed',
  createdAt: 'createdAt',
  usedAt: 'usedAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizationInvitationScalarFieldEnum = {
  id: 'id',
  email: 'email',
  organizationId: 'organizationId',
  invitedById: 'invitedById',
  role: 'role',
  token: 'token',
  expiresAt: 'expiresAt',
  acceptedAt: 'acceptedAt',
  revokedAt: 'revokedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizationMemberScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  onboardingStatus: 'onboardingStatus',
  onboardingStep: 'onboardingStep',
  onboardingCompletedAt: 'onboardingCompletedAt'
};

exports.Prisma.VaultScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  organizationId: 'organizationId',
  createdById: 'createdById',
  passwordHash: 'passwordHash',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  tags: 'tags'
};

exports.Prisma.KeyScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  vaultId: 'vaultId',
  createdById: 'createdById',
  currentVersionId: 'currentVersionId',
  valueType: 'valueType',
  tags: 'tags',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KeyVersionScalarFieldEnum = {
  id: 'id',
  keyId: 'keyId',
  versionNumber: 'versionNumber',
  encryptedValue: 'encryptedValue',
  encryptionMethod: 'encryptionMethod',
  kekId: 'kekId',
  kmsProvider: 'kmsProvider',
  createdById: 'createdById',
  commitMessage: 'commitMessage',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt',
  rotatedAt: 'rotatedAt'
};

exports.Prisma.KeyShareScalarFieldEnum = {
  id: 'id',
  keyId: 'keyId',
  userId: 'userId',
  groupId: 'groupId',
  encryptedDataKey: 'encryptedDataKey',
  algorithm: 'algorithm',
  createdAt: 'createdAt',
  revokedAt: 'revokedAt'
};

exports.Prisma.OneTimeShareScalarFieldEnum = {
  id: 'id',
  keyId: 'keyId',
  keyVersionId: 'keyVersionId',
  createdById: 'createdById',
  token: 'token',
  requirePassphrase: 'requirePassphrase',
  expiresAt: 'expiresAt',
  consumedAt: 'consumedAt',
  consumedByIp: 'consumedByIp',
  redemptionAttempts: 'redemptionAttempts',
  lastAttemptAt: 'lastAttemptAt',
  audienceEmail: 'audienceEmail',
  note: 'note',
  envelopeAlgorithm: 'envelopeAlgorithm',
  kmsProvider: 'kmsProvider',
  encryptedDataKey: 'encryptedDataKey',
  encryptedValue: 'encryptedValue',
  encryptedBlob: 'encryptedBlob',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TemporaryKeyScalarFieldEnum = {
  id: 'id',
  name: 'name',
  encryptedValue: 'encryptedValue',
  encryptionMethod: 'encryptionMethod',
  createdById: 'createdById',
  token: 'token',
  expiresAt: 'expiresAt',
  isUsed: 'isUsed',
  usedAt: 'usedAt',
  usedByIp: 'usedByIp',
  redemptionAttempts: 'redemptionAttempts',
  lastAttemptAt: 'lastAttemptAt',
  audienceEmail: 'audienceEmail',
  note: 'note',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VaultPermissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  groupId: 'groupId',
  vaultId: 'vaultId',
  permissionLevel: 'permissionLevel',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KeyPermissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  groupId: 'groupId',
  keyId: 'keyId',
  permissionLevel: 'permissionLevel',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GroupScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  organizationId: 'organizationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GroupMemberScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  resourceType: 'resourceType',
  resourceId: 'resourceId',
  details: 'details',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.SecretScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  vaultId: 'vaultId',
  keyId: 'keyId',
  currentVersionId: 'currentVersionId',
  passwordHash: 'passwordHash',
  createdById: 'createdById',
  metadata: 'metadata',
  tags: 'tags',
  expiresAt: 'expiresAt',
  lastAccessedAt: 'lastAccessedAt',
  accessCount: 'accessCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SecretVersionScalarFieldEnum = {
  id: 'id',
  secretId: 'secretId',
  versionNumber: 'versionNumber',
  encryptedValue: 'encryptedValue',
  encryptionContext: 'encryptionContext',
  createdById: 'createdById',
  commitMessage: 'commitMessage',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.MfaMethod = {
  TOTP: 'TOTP',
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  WEBAUTHN: 'WEBAUTHN'
};

exports.MfaRecoveryType = {
  BACKUP_CODE: 'BACKUP_CODE',
  RECOVERY_TOKEN: 'RECOVERY_TOKEN'
};

exports.Role = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER'
};

exports.KeyValueType = {
  STRING: 'STRING',
  JSON: 'JSON',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  MULTILINE: 'MULTILINE'
};

exports.PermissionLevel = {
  VIEW: 'VIEW',
  USE: 'USE',
  EDIT: 'EDIT',
  ADMIN: 'ADMIN'
};

exports.AuditAction = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  ROTATE_KEY: 'ROTATE_KEY',
  SHARE_KEY: 'SHARE_KEY',
  REVOKE_ACCESS: 'REVOKE_ACCESS',
  ADD_DEVICE: 'ADD_DEVICE',
  REMOVE_DEVICE: 'REMOVE_DEVICE',
  ENABLE_2FA: 'ENABLE_2FA',
  DISABLE_2FA: 'DISABLE_2FA',
  CREATE_TEMPORARY_KEY: 'CREATE_TEMPORARY_KEY',
  USE_TEMPORARY_KEY: 'USE_TEMPORARY_KEY',
  CREATE_SECRET: 'CREATE_SECRET',
  READ_SECRET: 'READ_SECRET',
  UPDATE_SECRET: 'UPDATE_SECRET',
  DELETE_SECRET: 'DELETE_SECRET',
  ROTATE_SECRET: 'ROTATE_SECRET'
};

exports.ResourceType = {
  ORGANIZATION: 'ORGANIZATION',
  VAULT: 'VAULT',
  KEY: 'KEY',
  SECRET: 'SECRET',
  USER: 'USER',
  GROUP: 'GROUP',
  KEY_VERSION: 'KEY_VERSION',
  SESSION: 'SESSION',
  DEVICE: 'DEVICE',
  ONBOARDING: 'ONBOARDING',
  TEMPORARY_KEY: 'TEMPORARY_KEY'
};

exports.Prisma.ModelName = {
  User: 'User',
  Device: 'Device',
  Session: 'Session',
  PasswordReset: 'PasswordReset',
  EmailVerification: 'EmailVerification',
  LoginAttempt: 'LoginAttempt',
  MfaRecovery: 'MfaRecovery',
  Organization: 'Organization',
  OrganizationInvitation: 'OrganizationInvitation',
  OrganizationMember: 'OrganizationMember',
  Vault: 'Vault',
  Key: 'Key',
  KeyVersion: 'KeyVersion',
  KeyShare: 'KeyShare',
  OneTimeShare: 'OneTimeShare',
  TemporaryKey: 'TemporaryKey',
  VaultPermission: 'VaultPermission',
  KeyPermission: 'KeyPermission',
  Group: 'Group',
  GroupMember: 'GroupMember',
  AuditLog: 'AuditLog',
  Secret: 'Secret',
  SecretVersion: 'SecretVersion'
};

/**
 * Create the Client
 */
class PrismaClient {
  constructor() {
    throw new Error(
      `PrismaClient is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
    )
  }
}
exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
