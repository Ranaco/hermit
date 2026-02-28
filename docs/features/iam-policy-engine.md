# IAM Policy Engine & Custom Roles

## High-Level Overview

Hermes has transitioned from a legacy, static Role-Based Access Control (RBAC) model (where permissions were hardcoded enums like `VIEW`, `USE`, `EDIT`) to a highly dynamic, AWS-style Identity and Access Management (IAM) Policy Engine.

This allows Organization Admins to create **Custom Roles**, define granular JSON **Policies**, and assign them directly to individual users or entirely to **Teams** (Groups).

## Core Architecture

### 1. Resource URNs

Every entity in the hierarchical structure of Hermes is addressed via a standard Uniform Resource Name (URN). This ensures precise matching during policy evaluation.

**Pattern**: `urn:hermes:org:{orgId}:{resourceType}:{resourceId}:[...subResources]`

Examples:

- **Vault**: `urn:hermes:org:abc-123:vault:xyz-789`
- **Secret**: `urn:hermes:org:abc-123:vault:xyz-789:secret:foo-456`
- **Key**: `urn:hermes:org:abc-123:vault:xyz-789:key:bar-321`

### 2. The Policy JSON Structure

Policies are stored as JSON documents outlining an array of statements.

```json
{
  "version": "1.0",
  "statements": [
    {
      "effect": "ALLOW",
      "actions": ["secrets:read", "secrets:create"],
      "resources": ["urn:hermes:org:*:vault:*:secret:*"]
    },
    {
      "effect": "DENY",
      "actions": ["vaults:delete"],
      "resources": ["*"]
    }
  ]
}
```

- **Effect**: `ALLOW` or `DENY`. (Default is Deny).
- **Actions**: The exact API methods requested (e.g. `vaults:read`). Wildcards like `secrets:*` are fully supported.
- **Resources**: Target URN strings. Wildcards `*` allow for expansive targeting across all child resources of an organization.

### 3. Policy Evaluation Precedence

The engine fetches _all_ policies strictly tied to the requesting user via direct Custom Roles _and_ through Team Roles.

1. All policies are merged into a single pool of statements.
2. If **ANY** statement explicitly evaluates to `DENY` for the given action and resource, the request is immediately dropped (`403 Forbidden`).
3. If no `DENY` is found, the engine checks for at least one explicit `ALLOW`.
4. If no `ALLOW` matches, the request falls back to the Default Deny paradigm.
5. **Special Bypass**: Members with the root `OWNER` schema-level role universally bypass evaluation and receive immediate access.

### 4. Group (Team) Permissions

Instead of assigning complex rules to individual users manually, members can be added to a `Team`.
Using the new `TeamRoleAssignment` pivot, Custom Roles can be attached to the Team. All users who belong to the Team instantly inherit the IAM policies of those Roles.

## Integration with the API (Middleware)

Access control is entirely handled via Express Middleware at the route level.

`router.get("/:vaultId", requirePolicy("vaults:read", getVaultUrn), vaultController.getVault);`

The `requirePolicy` middleware automatically extracts the user context, infers the Organization ID to bind the scope, calls the URN factory associated with the resource, and invokes the Policy Engine before ever touching the controllers.

## 5. HashiCorp Vault AppRole Integration

To enforce secure, machine-to-machine authentication between the Hermes API and the local Vault container (`hcv_engine`), Hermes relies on Vault **AppRoles**.

### Role Definitions & Capabilities

- **`read-only-role`**: Maps to `read-only-policy`. Used strictly for accessing and decrypting secrets. Cannot mount new engines or generate keys.
- **`write-role`**: Maps to `write-policy`. Grants overarching permissions including `sys/mounts/*` and `transit/keys/*`. The Hermes API initializes its `VaultService` client using this role to legitimately provision new transit keys and mount dynamic engines when users execute KMS actions.

### Authentication Lifecycle

1. The `hcv_engine` initialization script (`scripts/setup`) uploads the policies and provisions the corresponding AppRoles.
2. It generates a permanent `role_id` and a `secret_id` for each role.
3. For local development environments, the `secret_id` is generated with **unlimited uses** (`secret_id_num_uses=0`) and **no TTL** (`secret_id_ttl=0`). This architectural concession allows `nodemon` to repeatedly restart the Node backend and request fresh Vault sessions without prematurely expiring and locking out the developer with `403 Invalid Token` errors.
4. The `VaultService` authenticates via the `/v1/auth/approle/login` endpoint, obtains a short-lived `client_token`, and proactively schedules token renewals against the Vault APIs to prevent lockouts.
