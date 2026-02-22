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
  organizationId: uuidSchema,
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

// Grant team permission schema
export const grantTeamPermissionSchema = z.object({
  teamId: uuidSchema,
  permissionLevel: permissionLevelSchema,
});

// User ID param schema
export const vaultUserIdParamSchema = z.object({
  userId: uuidSchema,
});

// Team ID param schema
export const vaultTeamIdParamSchema = z.object({
  teamId: uuidSchema,
});
