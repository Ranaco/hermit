import { z } from 'zod';

export const createSecretGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Secret Group name is required')
    .max(255, 'Secret Group name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9-_. ]+$/, 'Group name can only contain letters, numbers, hyphens, underscores, dots, and spaces'),
  
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  vaultId: z
    .string()
    .uuid('Invalid vault ID format'),
  
  parentId: z
    .string()
    .uuid('Invalid parent ID format')
    .optional(),
});

export const updateSecretGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Secret Group name cannot be empty')
    .max(255, 'Secret Group name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9-_. ]+$/, 'Group name can only contain letters, numbers, hyphens, underscores, dots, and spaces')
    .optional(),
  
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
});

export const getSecretGroupsSchema = z.object({
  vaultId: z
    .string()
    .uuid('Invalid vault ID format'),
  
  parentId: z
    .string()
    .uuid('Invalid parent ID format')
    .optional(),
  
  includeChildren: z
    .string()
    .transform((val) => val === 'true')
    .or(z.boolean())
    .optional(),

  forPolicyBuilder: z
    .string()
    .transform((val) => val === 'true')
    .or(z.boolean())
    .optional(),
});
