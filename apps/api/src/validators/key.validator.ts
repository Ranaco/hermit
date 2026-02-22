/**
 * Key Validation Schemas
 */

import { z } from 'zod';

// UUID validation
const uuidSchema = z.string().uuid('Invalid UUID format');

// Permission level enum
const permissionLevelSchema = z.enum(['VIEW', 'USE', 'EDIT', 'ADMIN'], {
  errorMap: () => ({ message: 'Permission level must be one of: VIEW, USE, EDIT, ADMIN' }),
});

// Key value type enum
const keyValueTypeSchema = z.enum(['STRING', 'JSON', 'NUMBER', 'BOOLEAN', 'MULTILINE'], {
  errorMap: () => ({ message: 'Value type must be one of: STRING, JSON, NUMBER, BOOLEAN, MULTILINE' }),
});

// Create key schema
export const createKeySchema = z.object({
  name: z.string().min(1, 'Key name is required').max(100, 'Key name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().nullable(),
  vaultId: uuidSchema,
  valueType: keyValueTypeSchema.optional(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Update key schema
export const updateKeySchema = z.object({
  name: z.string().min(1, 'Key name is required').max(100, 'Key name must be at most 100 characters').optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().nullable(),
  valueType: keyValueTypeSchema.optional(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Get keys query schema
export const getKeysQuerySchema = z.object({
  vaultId: uuidSchema.optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().max(100).optional(),
});

// Key ID param schema
export const keyIdParamSchema = z.object({
  id: uuidSchema,
});

// Encrypt data schema
export const encryptDataSchema = z.object({
  plaintext: z.string().min(1, 'Plaintext is required'),
  context: z.string().optional(),
});

// Decrypt data schema
export const decryptDataSchema = z.object({
  ciphertext: z.string().min(1, 'Ciphertext is required').regex(/^vault:v\d+:/, 'Invalid ciphertext format'),
  context: z.string().optional(),
});

// Batch encrypt schema
export const batchEncryptSchema = z.object({
  plaintexts: z.array(z.string().min(1, 'Plaintext is required'))
    .min(1, 'At least one plaintext is required')
    .max(100, 'Maximum 100 plaintexts allowed')
    .optional(),
  items: z.array(
    z.object({
      plaintext: z.string().min(1, 'Plaintext is required'),
      context: z.string().optional(),
    }),
  )
    .min(1, 'At least one item is required')
    .max(100, 'Maximum 100 items allowed')
    .optional(),
}).refine((data) => (data.plaintexts && data.plaintexts.length > 0) || (data.items && data.items.length > 0), {
  message: 'Either plaintexts or items must be provided',
});

// Batch decrypt schema
export const batchDecryptSchema = z.object({
  ciphertexts: z.array(
    z.string().min(1, 'Ciphertext is required').regex(/^vault:v\d+:/, 'Invalid ciphertext format'),
  )
    .min(1, 'At least one ciphertext is required')
    .max(100, 'Maximum 100 ciphertexts allowed')
    .optional(),
  items: z.array(
    z.object({
      ciphertext: z.string().min(1, 'Ciphertext is required').regex(/^vault:v\d+:/, 'Invalid ciphertext format'),
      context: z.string().optional(),
    }),
  )
    .min(1, 'At least one item is required')
    .max(100, 'Maximum 100 items allowed')
    .optional(),
}).refine((data) => (data.ciphertexts && data.ciphertexts.length > 0) || (data.items && data.items.length > 0), {
  message: 'Either ciphertexts or items must be provided',
});

// Rotate key schema
export const rotateKeySchema = z.object({
  commitMessage: z.string().max(500, 'Commit message must be at most 500 characters').optional(),
});

// Grant user permission schema
export const grantKeyUserPermissionSchema = z.object({
  userId: uuidSchema,
  permissionLevel: permissionLevelSchema,
});

// Grant team permission schema
export const grantKeyTeamPermissionSchema = z.object({
  teamId: uuidSchema,
  permissionLevel: permissionLevelSchema,
});

// User ID param schema
export const keyUserIdParamSchema = z.object({
  userId: uuidSchema,
});

// Team ID param schema
export const keyTeamIdParamSchema = z.object({
  teamId: uuidSchema,
});

// Get key versions query schema
export const getKeyVersionsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Version ID param schema
export const versionIdParamSchema = z.object({
  versionId: uuidSchema,
});
