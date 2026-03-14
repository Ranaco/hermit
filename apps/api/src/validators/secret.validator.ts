/**
 * Secret Validation Schemas
 * Zod schemas for secret management endpoints
 */

import { z } from 'zod';

export const secretIdParamSchema = z.object({
  id: z.string().uuid('Invalid secret ID format'),
});

/**
 * Create Secret Schema
 */
export const createSecretSchema = z.object({
  name: z
    .string()
    .min(1, 'Secret name is required')
    .max(255, 'Secret name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9-_. ]+$/, 'Secret name can only contain letters, numbers, hyphens, underscores, dots, and spaces'),
  
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  value: z
    .string()
    .min(1, 'Secret value is required')
    .max(100000, 'Secret value is too large (max 100KB)'),
  
  valueType: z
    .enum(['STRING', 'JSON', 'NUMBER', 'BOOLEAN', 'MULTILINE'])
    .optional(),
  
  vaultId: z
    .string()
    .uuid('Invalid vault ID format'),
  
  keyId: z
    .string()
    .uuid('Invalid key ID format'),
  
  secretGroupId: z
    .string()
    .uuid('Invalid secret group ID format')
    .optional(),
  
  password: z
    .string()
    .min(8, 'Secret password must be at least 8 characters')
    .max(128, 'Secret password must be less than 128 characters')
    .optional(),
  
  metadata: z
    .record(z.any())
    .optional(),
  
  tags: z
    .array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  
  expiresAt: z
    .string()
    .datetime('Invalid expiration date format')
    .or(z.date())
    .optional()
    .refine(
      (date) => !date || new Date(date) > new Date(),
      'Expiration date must be in the future'
    ),
});

/**
 * Reveal Secret Schema
 */
export const revealSecretSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .optional(),
  
  vaultPassword: z
    .string()
    .min(1, 'Vault password is required')
    .optional(),
  
  versionNumber: z
    .number()
    .int()
    .positive()
    .optional(),
});

export const setCurrentSecretVersionSchema = z.object({
  versionId: z
    .string()
    .uuid('Invalid secret version ID format'),
});

/**
 * Bulk Reveal Secrets Schema
 * For CLI's `hermes run` — fetch and decrypt multiple secrets at once
 */
export const bulkRevealSecretsSchema = z.object({
  vaultId: z
    .string()
    .uuid('Invalid vault ID format'),

  secretGroupId: z
    .string()
    .uuid('Invalid secret group ID format')
    .optional(),

  secretIds: z
    .array(z.string().uuid('Invalid secret ID format'))
    .min(1, 'At least one secret ID is required')
    .optional(),

  includeDescendants: z
    .boolean()
    .optional(),

  password: z
    .string()
    .min(1, 'Password is required')
    .optional(),

  vaultPassword: z
    .string()
    .min(1, 'Vault password is required')
    .optional(),
});

/**
 * Update Secret Schema
 */
export const updateSecretSchema = z.object({
  value: z
    .string()
    .min(1, 'Secret value cannot be empty')
    .max(100000, 'Secret value is too large (max 100KB)')
    .optional(),
  
  valueType: z
    .enum(['STRING', 'JSON', 'NUMBER', 'BOOLEAN', 'MULTILINE'])
    .optional(),
  
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  password: z
    .string()
    .min(8, 'Secret password must be at least 8 characters')
    .max(128, 'Secret password must be less than 128 characters')
    .nullable()
    .optional(),
  
  metadata: z
    .record(z.any())
    .optional(),
  
  tags: z
    .array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  
  expiresAt: z
    .string()
    .datetime('Invalid expiration date format')
    .or(z.date())
    .nullable()
    .optional(),
  
  commitMessage: z
    .string()
    .max(500, 'Commit message must be less than 500 characters')
    .optional(),
  
  secretGroupId: z
    .string()
    .uuid('Invalid secret group ID format')
    .nullable()
    .optional(),
});

/**
 * Get Secrets Query Schema
 */
export const getSecretsSchema = z.object({
  vaultId: z
    .string()
    .uuid('Invalid vault ID format'),
  
  secretGroupId: z
    .string()
    .uuid('Invalid secret group ID format')
    .optional(),
  
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform((val) => Number.parseInt(val, 10))
    .or(z.number())
    .optional(),
  
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform((val) => Number.parseInt(val, 10))
    .or(z.number())
    .optional(),
  
  search: z
    .string()
    .max(100, 'Search term too long')
    .optional(),
});
