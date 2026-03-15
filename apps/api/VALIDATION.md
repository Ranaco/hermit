# 🛡️ Request Validation Schemas

Comprehensive Zod validation schemas for all Hermit KMS API endpoints.

## 📚 Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Available Schemas](#available-schemas)
  - [Authentication](#authentication)
  - [Vaults](#vaults)
  - [Keys](#keys)
  - [Users](#users)
  - [Organizations](#organizations)
- [Validation Rules](#validation-rules)
- [Error Handling](#error-handling)

## 🚀 Installation

Validation schemas are already included in the project. They use Zod for type-safe validation.

## 📖 Usage

### Basic Example

```typescript
import { validate } from './validators';
import { createVaultSchema, vaultIdParamSchema } from './validators';

// Apply validation to a route
router.post('/vaults', validate({ body: createVaultSchema }), createVault);

// Validate both params and body
router.patch('/:id', 
  validate({ 
    params: vaultIdParamSchema, 
    body: updateVaultSchema 
  }), 
  updateVault
);

// Validate query parameters
router.get('/', validate({ query: getVaultsQuerySchema }), getVaults);
```

### Multiple Validations

```typescript
// Combine param schemas
router.delete('/:id/permissions/users/:userId',
  validate({
    params: vaultIdParamSchema.merge(userIdParamSchema)
  }),
  revokeUserPermission
);
```

## 📋 Available Schemas

### Authentication

#### `registerSchema`
- **email**: Valid email, lowercase
- **password**: Min 8 chars, must contain uppercase, lowercase, number, and special character
- **firstName**: Optional, 1-50 characters
- **lastName**: Optional, 1-50 characters
- **username**: Optional, 3-30 chars, alphanumeric with underscores/hyphens
- **organizationName**: Optional, 1-100 characters
- **deviceFingerprint**: Optional string

```typescript
router.post('/register', validate({ body: registerSchema }), register);
```

#### `loginSchema`
- **email**: Valid email
- **password**: Required
- **mfaToken**: Optional, 6 digits
- **deviceFingerprint**: Optional string

```typescript
router.post('/login', validate({ body: loginSchema }), login);
```

#### Other Auth Schemas
- `refreshTokenSchema` - Refresh access tokens
- `logoutSchema` - Logout endpoint
- `verifyMfaSetupSchema` - Verify MFA setup
- `disableMfaSchema` - Disable MFA
- `changePasswordSchema` - Change password
- `requestPasswordResetSchema` - Request password reset
- `resetPasswordSchema` - Reset password with token
- `verifyEmailSchema` - Verify email
- `resendVerificationSchema` - Resend verification email

### Vaults

#### `createVaultSchema`
- **name**: Required, 1-100 characters
- **description**: Optional, max 500 characters
- **organizationId**: Optional UUID

```typescript
router.post('/', validate({ body: createVaultSchema }), createVault);
```

#### `updateVaultSchema`
- **name**: Optional, 1-100 characters
- **description**: Optional, max 500 characters

#### `getVaultsQuerySchema`
- **organizationId**: Optional UUID
- **page**: Optional number
- **limit**: Optional number

#### `vaultIdParamSchema`
- **id**: Required UUID

#### `grantUserPermissionSchema`
- **userId**: Required UUID
- **permissionLevel**: Required, one of: VIEW, USE, EDIT, ADMIN

```typescript
router.post('/:id/permissions/users', 
  validate({ 
    params: vaultIdParamSchema,
    body: grantUserPermissionSchema 
  }), 
  grantUserPermission
);
```

### Keys

#### `createKeySchema`
- **name**: Required, 1-100 characters
- **description**: Optional, max 500 characters
- **vaultId**: Required UUID
- **valueType**: Optional, one of: STRING, JSON, NUMBER, BOOLEAN, MULTILINE
- **tags**: Optional array, max 20 tags, each max 50 chars
- **metadata**: Optional object

```typescript
router.post('/', validate({ body: createKeySchema }), createKey);
```

#### `encryptDataSchema`
- **plaintext**: Required, non-empty string
- **context**: Optional string

```typescript
router.post('/:id/encrypt', 
  validate({ 
    params: keyIdParamSchema,
    body: encryptDataSchema 
  }), 
  encryptData
);
```

#### `decryptDataSchema`
- **ciphertext**: Required, must match format `vault:v*:...`
- **context**: Optional string

#### `batchEncryptSchema`
- **items**: Array of 1-100 items, each with plaintext and optional context

#### `batchDecryptSchema`
- **items**: Array of 1-100 items, each with ciphertext and optional context

#### `rotateKeySchema`
- **commitMessage**: Optional, max 500 characters

```typescript
router.post('/:id/rotate', 
  validate({ 
    params: keyIdParamSchema,
    body: rotateKeySchema 
  }), 
  rotateKey
);
```

### Users

#### `updateProfileSchema`
- **firstName**: Optional, 1-50 characters
- **lastName**: Optional, 1-50 characters
- **username**: Optional, 3-30 chars, alphanumeric with underscores/hyphens

```typescript
router.patch('/profile', validate({ body: updateProfileSchema }), updateProfile);
```

#### `updateUserSettingsSchema`
- **requiresMfaForSensitiveOps**: Optional boolean
- **email**: Optional, valid email

#### `getUsersQuerySchema`
- **page**: Optional number
- **limit**: Optional number
- **search**: Optional string, max 100 chars
- **organizationId**: Optional UUID

### Organizations

#### `createOrganizationSchema`
- **name**: Required, 1-100 characters
- **description**: Optional, max 500 characters

```typescript
router.post('/', validate({ body: createOrganizationSchema }), createOrganization);
```

#### `addMemberSchema`
- **userId**: Required UUID
- **role**: Optional, one of: OWNER, ADMIN, MEMBER (default: MEMBER)

```typescript
router.post('/:id/members', 
  validate({ 
    params: organizationIdParamSchema,
    body: addMemberSchema 
  }), 
  addMember
);
```

#### `inviteMemberSchema`
- **email**: Required, valid email
- **role**: Optional, one of: OWNER, ADMIN, MEMBER (default: MEMBER)

#### `createGroupSchema`
- **name**: Required, 1-100 characters
- **description**: Optional, max 500 characters

## ✅ Validation Rules

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### UUID Format
All IDs must be valid UUIDs (e.g., `550e8400-e29b-41d4-a716-446655440000`)

### Email Format
Must be a valid email address, automatically converted to lowercase

### Permission Levels
- **VIEW**: Read-only access
- **USE**: Can use the resource (e.g., encrypt/decrypt)
- **EDIT**: Can modify the resource
- **ADMIN**: Full control including permission management

### Organization Roles
- **OWNER**: Full control over the organization
- **ADMIN**: Can manage members and resources
- **MEMBER**: Basic access to organization resources

## ❌ Error Handling

When validation fails, a `ValidationError` is thrown with:

```json
{
  "code": "VAL_10001",
  "message": "name: Vault name is required, permissionLevel: Permission level must be one of: VIEW, USE, EDIT, ADMIN",
  "statusCode": 400,
  "timestamp": "2025-11-02T..."
}
```

### Common Validation Errors

- **Missing required fields**: "Field name is required"
- **Invalid format**: "Invalid email format", "Invalid UUID format"
- **Length violations**: "Must be at least X characters", "Must be at most Y characters"
- **Pattern mismatches**: "Must contain only letters, numbers..."
- **Enum violations**: "Must be one of: VALUE1, VALUE2..."

## 🎯 Best Practices

1. **Always validate user input** - Apply validation to all routes that accept user data
2. **Validate all sources** - body, query params, and URL params
3. **Combine schemas** - Use `.merge()` to combine multiple param schemas
4. **Type safety** - Zod infers TypeScript types from schemas automatically
5. **Custom error messages** - Schemas include user-friendly error messages

## 📝 Example Route Setup

```typescript
// apps/api/src/routes/vault.routes.ts
import { Router } from 'express';
import { validate } from '../validators';
import {
  createVaultSchema,
  updateVaultSchema,
  getVaultsQuerySchema,
  vaultIdParamSchema,
  grantUserPermissionSchema,
  userIdParamSchema,
} from '../validators';
import {
  createVault,
  getVaults,
  getVault,
  updateVault,
  deleteVault,
  grantUserPermission,
  revokeUserPermission,
} from '../controllers/vault.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create vault - validate body
router.post('/', 
  validate({ body: createVaultSchema }), 
  createVault
);

// Get vaults - validate query params
router.get('/', 
  validate({ query: getVaultsQuerySchema }), 
  getVaults
);

// Get vault - validate URL params
router.get('/:id', 
  validate({ params: vaultIdParamSchema }), 
  getVault
);

// Update vault - validate params and body
router.patch('/:id', 
  validate({ 
    params: vaultIdParamSchema, 
    body: updateVaultSchema 
  }), 
  updateVault
);

// Delete vault - validate params
router.delete('/:id', 
  validate({ params: vaultIdParamSchema }), 
  deleteVault
);

// Grant permission - validate params and body
router.post('/:id/permissions/users', 
  validate({ 
    params: vaultIdParamSchema,
    body: grantUserPermissionSchema 
  }), 
  grantUserPermission
);

// Revoke permission - validate combined params
router.delete('/:id/permissions/users/:userId', 
  validate({ 
    params: vaultIdParamSchema.merge(userIdParamSchema) 
  }), 
  revokeUserPermission
);

export default router;
```

## 🔧 Extending Schemas

To add custom validation:

```typescript
import { z } from 'zod';

// Extend existing schema
const createVaultWithTagsSchema = createVaultSchema.extend({
  tags: z.array(z.string()).max(10).optional(),
});

// Or create custom schema
const customSchema = z.object({
  customField: z.string()
    .min(5)
    .max(50)
    .regex(/^[A-Z]/, 'Must start with uppercase letter'),
});
```

---

**All validations are now in place!** 🎉 Apply them to your routes for robust input validation.
