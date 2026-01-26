/**
 * Vault Validation Schemas
 */

import { z } from "zod";

// UUID validation
const uuidSchema = z.string().uuid("Invalid UUID format");

// Permission level enum
const permissionLevelSchema = z.enum(["VIEW", "USE", "EDIT", "ADMIN"], {
  errorMap: () => ({
    message: "Permission level must be one of: VIEW, USE, EDIT, ADMIN",
  }),
});

// Create vault schema
export const createVaultSchema = z.object({
  name: z
    .string()
    .min(1, "Vault name is required")
    .max(100, "Vault name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
  organizationId: uuidSchema.optional(),
});

// Update vault schema
export const updateVaultSchema = z.object({
  name: z
    .string()
    .min(1, "Vault name is required")
    .max(100, "Vault name must be at most 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
});

// Get vaults query schema
export const getVaultsQuerySchema = z.object({
  organizationId: uuidSchema.optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Vault ID param schema
export const vaultIdParamSchema = z.object({
  id: uuidSchema,
});

// Grant user permission schema
export const grantUserPermissionSchema = z.object({
  userId: uuidSchema,
  permissionLevel: permissionLevelSchema,
});

// Grant group permission schema
export const grantGroupPermissionSchema = z.object({
  groupId: uuidSchema,
  permissionLevel: permissionLevelSchema,
});

// User ID param schema
export const vaultUserIdParamSchema = z.object({
  userId: uuidSchema,
});

// Group ID param schema
export const vaultGroupIdParamSchema = z.object({
  groupId: uuidSchema,
});
