/**
 * Organization Validation Schemas
 */

import { z } from "zod";

// UUID validation
const uuidSchema = z.string().uuid("Invalid UUID format");

// Email validation
const emailSchema = z.string().email("Invalid email format").toLowerCase();

// Role enum
const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"], {
  errorMap: () => ({ message: "Role must be one of: OWNER, ADMIN, MEMBER" }),
});

// Create organization schema
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
});

// Update organization schema
export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name must be at most 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
});

// Get organizations query schema
export const getOrganizationsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().max(100).optional(),
});

// Organization ID param schema
export const organizationIdParamSchema = z.object({
  id: uuidSchema,
});

// Add member schema
export const addMemberSchema = z.object({
  userId: uuidSchema,
  role: roleSchema.optional().default("MEMBER"),
});

// Update member role schema
export const updateMemberRoleSchema = z.object({
  role: roleSchema,
});

// Member ID param schema
export const orgMemberIdParamSchema = z.object({
  userId: uuidSchema,
});

// Invite member schema
export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: roleSchema.optional().default("MEMBER"),
});

// Accept invitation schema (token from query params)
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
});

// Revoke invitation schema
export const revokeInvitationSchema = z.object({
  invitationId: uuidSchema,
});

// Create team schema
export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Team name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
});

// Update team schema
export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Team name must be at most 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
});

// Add team member schema
export const addTeamMemberSchema = z.object({
  userId: uuidSchema,
});

// Team ID param schema
export const orgTeamIdParamSchema = z.object({
  teamId: uuidSchema,
});

// Team member ID param schema
export const teamMemberIdParamSchema = z.object({
  userId: uuidSchema,
});
