export type EndpointAuth = "public" | "bearer" | "cli";

export type ApiEndpoint = {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
  path: string;
  summary: string;
  auth: EndpointAuth;
  tags: string[];
  requestExample?: string;
  notes?: string[];
  defaultOpen?: boolean;
};

export type ApiEndpointGroup = {
  id: string;
  title: string;
  description: string;
  endpoints: ApiEndpoint[];
};

export const endpointAuthLabel: Record<EndpointAuth, string> = {
  public: "Public",
  bearer: "Bearer token",
  cli: "Bearer + CLI signature",
};

export const apiEndpointGroups: ApiEndpointGroup[] = [
  {
    id: "system",
    title: "System",
    description: "Operational endpoints for health, connectivity, and basic API metadata.",
    endpoints: [
      { id: "health", method: "GET", path: "/health", summary: "Basic API health status.", auth: "public", tags: ["system"] },
      {
        id: "status",
        method: "GET",
        path: "/status",
        summary: "API, database, and Vault connectivity status.",
        auth: "public",
        tags: ["system"],
        defaultOpen: true,
        notes: ["Use this first when you want to confirm the deployed docs and API are on the same origin."],
      },
      { id: "info", method: "GET", path: "/api/info", summary: "Static API metadata and enabled feature flags.", auth: "public", tags: ["system"] },
    ],
  },
  {
    id: "authentication",
    title: "Authentication",
    description: "User registration, login, refresh, logout, MFA, devices, and CLI enrollment.",
    endpoints: [
      {
        id: "register",
        method: "POST",
        path: "/api/auth/register",
        summary: "Create a user account and optionally bootstrap device info.",
        auth: "public",
        tags: ["auth"],
        requestExample: JSON.stringify({ email: "operator@example.com", password: "Str0ng!Pass" }, null, 2),
      },
      {
        id: "login",
        method: "POST",
        path: "/api/auth/login",
        summary: "Exchange credentials for access and refresh tokens.",
        auth: "public",
        tags: ["auth"],
        requestExample: JSON.stringify({ email: "operator@example.com", password: "Str0ng!Pass" }, null, 2),
      },
      {
        id: "refresh",
        method: "POST",
        path: "/api/auth/refresh",
        summary: "Exchange a refresh token for a new access token.",
        auth: "public",
        tags: ["auth"],
        requestExample: JSON.stringify({ refreshToken: "<refresh-token>" }, null, 2),
      },
      { id: "logout", method: "POST", path: "/api/auth/logout", summary: "Invalidate the current refresh token.", auth: "bearer", tags: ["auth"], requestExample: JSON.stringify({ refreshToken: "<refresh-token>" }, null, 2) },
      { id: "mfa-setup", method: "POST", path: "/api/auth/mfa/setup", summary: "Start MFA setup and retrieve enrollment material.", auth: "bearer", tags: ["auth"] },
      { id: "mfa-enable", method: "POST", path: "/api/auth/mfa/enable", summary: "Enable MFA after verifying the setup token.", auth: "bearer", tags: ["auth"], requestExample: JSON.stringify({ token: "123456" }, null, 2) },
      { id: "mfa-disable", method: "POST", path: "/api/auth/mfa/disable", summary: "Disable MFA with password confirmation.", auth: "bearer", tags: ["auth"], requestExample: JSON.stringify({ token: "123456", password: "Str0ng!Pass" }, null, 2) },
      { id: "devices", method: "GET", path: "/api/auth/devices", summary: "List browser and CLI devices bound to the user.", auth: "bearer", tags: ["auth"] },
      { id: "remove-device", method: "DELETE", path: "/api/auth/devices/:id", summary: "Remove a trusted device.", auth: "bearer", tags: ["auth"] },
      {
        id: "cli-enroll",
        method: "POST",
        path: "/api/auth/cli/enroll",
        summary: "Promote the current authenticated device into an official CLI device.",
        auth: "bearer",
        tags: ["auth", "cli"],
        requestExample: JSON.stringify({ cliPublicKey: "<public-key>", hardwareFingerprint: "<fingerprint>", cliLabel: "local-dev" }, null, 2),
      },
    ],
  },
  {
    id: "users",
    title: "User account",
    description: "Self-service account, password, and email verification flows.",
    endpoints: [
      { id: "users-me", method: "GET", path: "/api/users/me", summary: "Return the current user profile.", auth: "bearer", tags: ["users"] },
      { id: "users-me-update", method: "PATCH", path: "/api/users/me", summary: "Update profile details.", auth: "bearer", tags: ["users"] },
      { id: "users-password-change", method: "POST", path: "/api/users/me/password", summary: "Change the current password.", auth: "bearer", tags: ["users"], requestExample: JSON.stringify({ currentPassword: "Str0ng!Pass", newPassword: "An0ther!Pass" }, null, 2) },
      { id: "users-delete", method: "DELETE", path: "/api/users/me", summary: "Delete the current account.", auth: "bearer", tags: ["users"] },
      { id: "reset-request", method: "POST", path: "/api/users/password/reset-request", summary: "Request a password reset token.", auth: "public", tags: ["users"], requestExample: JSON.stringify({ email: "operator@example.com" }, null, 2) },
      { id: "reset-password", method: "POST", path: "/api/users/password/reset", summary: "Reset a password with a token.", auth: "public", tags: ["users"], requestExample: JSON.stringify({ token: "<token>", newPassword: "Str0ng!Pass" }, null, 2) },
      { id: "verify-email", method: "POST", path: "/api/users/verify-email", summary: "Verify an email address from a token.", auth: "public", tags: ["users"], requestExample: JSON.stringify({ token: "<token>" }, null, 2) },
      { id: "resend-verification", method: "POST", path: "/api/users/resend-verification", summary: "Resend verification mail for the current user.", auth: "bearer", tags: ["users"] },
    ],
  },
  {
    id: "organizations",
    title: "Organizations and access",
    description: "Organization CRUD, memberships, invitations, teams, graph views, IAM policies, and custom roles.",
    endpoints: [
      { id: "org-create", method: "POST", path: "/api/organizations", summary: "Create an organization.", auth: "bearer", tags: ["organizations"], requestExample: JSON.stringify({ name: "Acme Security" }, null, 2) },
      { id: "org-list", method: "GET", path: "/api/organizations", summary: "List organizations visible to the caller.", auth: "bearer", tags: ["organizations"] },
      { id: "org-invitations-mine", method: "GET", path: "/api/organizations/invitations/mine", summary: "List invitations for the current user.", auth: "bearer", tags: ["organizations"] },
      { id: "org-invitations-accept", method: "POST", path: "/api/organizations/invitations/accept", summary: "Accept an invitation token.", auth: "bearer", tags: ["organizations"], requestExample: JSON.stringify({ token: "<invite-token>" }, null, 2) },
      { id: "org-read", method: "GET", path: "/api/organizations/:id", summary: "Read an organization.", auth: "bearer", tags: ["organizations"] },
      { id: "org-update", method: "PATCH", path: "/api/organizations/:id", summary: "Update organization metadata.", auth: "bearer", tags: ["organizations"] },
      { id: "org-delete", method: "DELETE", path: "/api/organizations/:id", summary: "Delete an organization.", auth: "bearer", tags: ["organizations"] },
      { id: "org-members", method: "GET", path: "/api/organizations/:id/members", summary: "List members in an organization.", auth: "bearer", tags: ["organizations"] },
      { id: "org-invite", method: "POST", path: "/api/organizations/:id/invitations", summary: "Invite a user into an organization.", auth: "bearer", tags: ["organizations"], requestExample: JSON.stringify({ email: "new.user@example.com" }, null, 2) },
      { id: "org-invitations", method: "GET", path: "/api/organizations/:id/invitations", summary: "List invitations for an organization.", auth: "bearer", tags: ["organizations"] },
      { id: "org-invite-revoke", method: "DELETE", path: "/api/organizations/:id/invitations/:invitationId", summary: "Revoke an invitation.", auth: "bearer", tags: ["organizations"] },
      { id: "org-member-update", method: "PATCH", path: "/api/organizations/:id/members/:userId", summary: "Update a member role.", auth: "bearer", tags: ["organizations"], requestExample: JSON.stringify({ roleId: "<role-id>" }, null, 2) },
      { id: "org-member-remove", method: "DELETE", path: "/api/organizations/:id/members/:userId", summary: "Remove a member from the organization.", auth: "bearer", tags: ["organizations"] },
      { id: "org-teams", method: "GET", path: "/api/organizations/:id/teams", summary: "List teams.", auth: "bearer", tags: ["organizations"] },
      { id: "org-graph", method: "GET", path: "/api/organizations/:id/graph", summary: "Read the organization access graph.", auth: "bearer", tags: ["organizations"] },
      { id: "org-graph-access", method: "GET", path: "/api/organizations/:id/graph/access", summary: "Query graph-derived access information.", auth: "bearer", tags: ["organizations"] },
      { id: "team-create", method: "POST", path: "/api/organizations/:id/teams", summary: "Create a team.", auth: "bearer", tags: ["organizations"], requestExample: JSON.stringify({ name: "Payments" }, null, 2) },
      { id: "team-update", method: "PATCH", path: "/api/organizations/:id/teams/:teamId", summary: "Update team metadata.", auth: "bearer", tags: ["organizations"] },
      { id: "team-delete", method: "DELETE", path: "/api/organizations/:id/teams/:teamId", summary: "Delete a team.", auth: "bearer", tags: ["organizations"] },
      { id: "team-member-add", method: "POST", path: "/api/organizations/:id/teams/:teamId/members", summary: "Add a member to a team.", auth: "bearer", tags: ["organizations"], requestExample: JSON.stringify({ userId: "<user-id>" }, null, 2) },
      { id: "team-member-remove", method: "DELETE", path: "/api/organizations/:id/teams/:teamId/members/:userId", summary: "Remove a team member.", auth: "bearer", tags: ["organizations"] },
      { id: "policy-list", method: "GET", path: "/api/organizations/:orgId/policies", summary: "List IAM policies.", auth: "bearer", tags: ["organizations", "iam"] },
      { id: "policy-create", method: "POST", path: "/api/organizations/:orgId/policies", summary: "Create an IAM policy.", auth: "bearer", tags: ["organizations", "iam"], requestExample: JSON.stringify({ name: "Secrets Read", statements: [] }, null, 2) },
      { id: "policy-update", method: "PUT", path: "/api/organizations/:orgId/policies/:policyId", summary: "Update an IAM policy.", auth: "bearer", tags: ["organizations", "iam"], requestExample: JSON.stringify({ name: "Updated Policy", statements: [] }, null, 2) },
      { id: "policy-delete", method: "DELETE", path: "/api/organizations/:orgId/policies/:policyId", summary: "Delete an IAM policy.", auth: "bearer", tags: ["organizations", "iam"] },
      { id: "role-list", method: "GET", path: "/api/organizations/:orgId/roles", summary: "List custom roles.", auth: "bearer", tags: ["organizations", "iam"] },
      { id: "role-create", method: "POST", path: "/api/organizations/:orgId/roles", summary: "Create a custom role.", auth: "bearer", tags: ["organizations", "iam"], requestExample: JSON.stringify({ name: "Reader", description: "Read-only access" }, null, 2) },
      { id: "role-update", method: "PUT", path: "/api/organizations/:orgId/roles/:roleId", summary: "Update a custom role.", auth: "bearer", tags: ["organizations", "iam"], requestExample: JSON.stringify({ name: "Ops Reader" }, null, 2) },
      { id: "member-role-assign", method: "PUT", path: "/api/organizations/:orgId/members/:memberId/roles", summary: "Assign a role to a member.", auth: "bearer", tags: ["organizations", "iam"], requestExample: JSON.stringify({ roleIds: ["<role-id>"] }, null, 2) },
      { id: "team-role-assign", method: "PUT", path: "/api/organizations/:orgId/teams/:teamId/roles", summary: "Assign a role to a team.", auth: "bearer", tags: ["organizations", "iam"], requestExample: JSON.stringify({ roleIds: ["<role-id>"] }, null, 2) },
      { id: "team-role-list", method: "GET", path: "/api/organizations/:orgId/teams/:teamId/roles", summary: "List a team's role attachments.", auth: "bearer", tags: ["organizations", "iam"] },
      { id: "team-role-remove", method: "DELETE", path: "/api/organizations/:orgId/teams/:teamId/roles/:roleId", summary: "Remove a role from a team.", auth: "bearer", tags: ["organizations", "iam"] },
    ],
  },
  {
    id: "vaults-keys",
    title: "Vaults and keys",
    description: "Vault CRUD, key lifecycle, rotation, and cryptographic operations.",
    endpoints: [
      { id: "vault-create", method: "POST", path: "/api/vaults", summary: "Create a vault under an organization.", auth: "bearer", tags: ["vaults"], requestExample: JSON.stringify({ name: "Production Vault", organizationId: "<org-id>" }, null, 2) },
      { id: "vault-list", method: "GET", path: "/api/vaults", summary: "List vaults.", auth: "bearer", tags: ["vaults"] },
      { id: "vault-read", method: "GET", path: "/api/vaults/:id", summary: "Read a vault.", auth: "bearer", tags: ["vaults"] },
      { id: "vault-update", method: "PATCH", path: "/api/vaults/:id", summary: "Update vault metadata.", auth: "bearer", tags: ["vaults"] },
      { id: "vault-delete", method: "DELETE", path: "/api/vaults/:id", summary: "Delete a vault.", auth: "bearer", tags: ["vaults"] },
      { id: "key-create", method: "POST", path: "/api/keys", summary: "Create a key within a vault.", auth: "bearer", tags: ["keys"], requestExample: JSON.stringify({ name: "payments-master-key", vaultId: "<vault-id>", valueType: "STRING" }, null, 2) },
      { id: "key-list", method: "GET", path: "/api/keys?vaultId=<vault-id>", summary: "List keys for a vault.", auth: "bearer", tags: ["keys"] },
      { id: "key-read", method: "GET", path: "/api/keys/:id", summary: "Read a key.", auth: "bearer", tags: ["keys"] },
      { id: "key-rotate", method: "POST", path: "/api/keys/:id/rotate", summary: "Rotate a key version.", auth: "bearer", tags: ["keys"] },
      { id: "key-delete", method: "DELETE", path: "/api/keys/:id", summary: "Delete a key.", auth: "bearer", tags: ["keys"] },
      { id: "key-encrypt", method: "POST", path: "/api/keys/:id/encrypt", summary: "Encrypt plaintext with a key.", auth: "bearer", tags: ["keys"], requestExample: JSON.stringify({ plaintext: "sk_live_example" }, null, 2) },
      { id: "key-decrypt", method: "POST", path: "/api/keys/:id/decrypt", summary: "Decrypt ciphertext with a key.", auth: "bearer", tags: ["keys"], requestExample: JSON.stringify({ ciphertext: "vault:v1:..." }, null, 2) },
      { id: "key-encrypt-batch", method: "POST", path: "/api/keys/:id/encrypt/batch", summary: "Batch-encrypt multiple values.", auth: "bearer", tags: ["keys"], requestExample: JSON.stringify({ plaintexts: ["one", "two"] }, null, 2) },
      { id: "key-decrypt-batch", method: "POST", path: "/api/keys/:id/decrypt/batch", summary: "Batch-decrypt multiple values.", auth: "bearer", tags: ["keys"], requestExample: JSON.stringify({ ciphertexts: ["vault:v1:...", "vault:v1:..."] }, null, 2) },
    ],
  },
  {
    id: "secrets",
    title: "Secrets",
    description: "Secret CRUD, reveal flows, bulk reveal, CLI-specific access, and version pointers.",
    endpoints: [
      { id: "secret-create", method: "POST", path: "/api/secrets", summary: "Create a secret.", auth: "bearer", tags: ["secrets"], requestExample: JSON.stringify({ name: "STRIPE_API_KEY", vaultId: "<vault-id>", keyId: "<key-id>", value: "sk_live_example" }, null, 2) },
      { id: "secret-list", method: "GET", path: "/api/secrets?vaultId=<vault-id>", summary: "List secrets in a vault or group.", auth: "bearer", tags: ["secrets"] },
      { id: "secret-read", method: "GET", path: "/api/secrets/:id", summary: "Read secret metadata.", auth: "bearer", tags: ["secrets"] },
      { id: "secret-reveal", method: "POST", path: "/api/secrets/:id/reveal", summary: "Reveal a secret value, with password challenge when required.", auth: "bearer", tags: ["secrets"], requestExample: JSON.stringify({}, null, 2), notes: ["A 403 can be an interactive password challenge, not a terminal denial."] },
      { id: "secret-bulk-reveal", method: "POST", path: "/api/secrets/bulk-reveal", summary: "Reveal multiple secrets in one request.", auth: "bearer", tags: ["secrets"], requestExample: JSON.stringify({ vaultId: "<vault-id>", secretIds: ["<secret-id>"] }, null, 2) },
      { id: "secret-cli-reveal", method: "POST", path: "/api/secrets/:id/cli-reveal", summary: "Reveal a secret through the official CLI path.", auth: "cli", tags: ["secrets", "cli"], requestExample: JSON.stringify({ versionNumber: 1 }, null, 2) },
      { id: "secret-cli-bulk-reveal", method: "POST", path: "/api/secrets/cli/bulk-reveal", summary: "Bulk reveal for CLI runtime injection.", auth: "cli", tags: ["secrets", "cli"], requestExample: JSON.stringify({ vaultId: "<vault-id>", includeDescendants: true }, null, 2) },
      { id: "secret-update", method: "PUT", path: "/api/secrets/:id", summary: "Update a secret and create a new version.", auth: "bearer", tags: ["secrets"], requestExample: JSON.stringify({ value: "updated-secret" }, null, 2) },
      { id: "secret-delete", method: "DELETE", path: "/api/secrets/:id", summary: "Delete a secret.", auth: "bearer", tags: ["secrets"] },
      { id: "secret-versions", method: "GET", path: "/api/secrets/:id/versions", summary: "List secret versions.", auth: "bearer", tags: ["secrets"] },
      { id: "secret-current-version", method: "POST", path: "/api/secrets/:id/current-version", summary: "Move the current version pointer.", auth: "bearer", tags: ["secrets"], requestExample: JSON.stringify({ versionId: "<version-id>" }, null, 2) },
    ],
  },
  {
    id: "secret-groups",
    title: "Secret groups",
    description: "Grouped secret hierarchy inside a vault.",
    endpoints: [
      { id: "group-list", method: "GET", path: "/api/vaults/:vaultId/groups", summary: "List groups in a vault.", auth: "bearer", tags: ["groups"] },
      { id: "group-create", method: "POST", path: "/api/vaults/:vaultId/groups", summary: "Create a group.", auth: "bearer", tags: ["groups"], requestExample: JSON.stringify({ name: "payments", path: "payments" }, null, 2) },
      { id: "group-update", method: "PUT", path: "/api/vaults/:vaultId/groups/:groupId", summary: "Update a group.", auth: "bearer", tags: ["groups"], requestExample: JSON.stringify({ name: "payments-core" }, null, 2) },
      { id: "group-delete", method: "DELETE", path: "/api/vaults/:vaultId/groups/:groupId", summary: "Delete a group.", auth: "bearer", tags: ["groups"] },
    ],
  },
  {
    id: "sharing",
    title: "Sharing",
    description: "Public one-time-share consumption plus authenticated share creation.",
    endpoints: [
      { id: "share-metadata", method: "GET", path: "/api/shares/:token", summary: "Read public share metadata.", auth: "public", tags: ["shares"] },
      { id: "share-consume", method: "POST", path: "/api/shares/:token/consume", summary: "Consume a one-time share.", auth: "public", tags: ["shares"], requestExample: JSON.stringify({ passphrase: "<passphrase>" }, null, 2) },
      { id: "share-create", method: "POST", path: "/api/shares", summary: "Create a share from an authenticated secret workflow.", auth: "bearer", tags: ["shares"], requestExample: JSON.stringify({ keyId: "<key-id>", secretId: "<secret-id>" }, null, 2) },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding",
    description: "First-run organization bootstrap and completion state.",
    endpoints: [
      { id: "onboarding-status", method: "GET", path: "/api/onboarding/status", summary: "Return onboarding status for the current user.", auth: "bearer", tags: ["onboarding"] },
      { id: "onboarding-org", method: "POST", path: "/api/onboarding/organization", summary: "Create the first organization.", auth: "bearer", tags: ["onboarding"], requestExample: JSON.stringify({ name: "Acme Security" }, null, 2) },
      { id: "onboarding-complete", method: "POST", path: "/api/onboarding/complete", summary: "Mark onboarding complete.", auth: "bearer", tags: ["onboarding"] },
    ],
  },
  {
    id: "audit",
    title: "Audit",
    description: "Read audit entries for operational investigation and compliance workflows.",
    endpoints: [{ id: "audit-list", method: "GET", path: "/api/audit", summary: "Query audit logs.", auth: "bearer", tags: ["audit"] }],
  },
];

export const authEndpoints = apiEndpointGroups.filter((group) =>
  ["authentication", "users"].includes(group.id),
);

export const resourceEndpoints = apiEndpointGroups.filter((group) =>
  ["system", "organizations", "vaults-keys", "secrets", "secret-groups", "sharing", "onboarding", "audit"].includes(group.id),
);

export const apiPlaygroundPresets = {
  login: apiEndpointGroups[1].endpoints[1],
  currentUser: apiEndpointGroups[2].endpoints[0],
  keyCreate: apiEndpointGroups[4].endpoints[5],
  secretReveal: apiEndpointGroups[5].endpoints[3],
  cliReveal: apiEndpointGroups[5].endpoints[5],
};
