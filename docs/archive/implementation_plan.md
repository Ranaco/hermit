# Hermes KMS - Proper Flow Implementation Plan

## Current Issues
The system doesn't enforce the correct flow for user onboarding and resource creation.

## Correct Flow

### 1. User Registration/Login
- User signs up or logs in
- **Status**: User has no organization

### 2. Organization Setup (Required for Dashboard Access)
- User MUST join or create an organization
- Without an organization, user cannot access dashboard
- Options:
  - Create new organization
  - Accept invitation to existing organization
- **Status**: User has organization membership

### 3. Dashboard Access (After Organization)
- User can now access dashboard
- **First-time users**: Onboarding wizard should guide them

### 4. Vault Creation (Required for Keys)
- When user accesses dashboard for first time:
  - **Auto-create a default vault** named "Default Vault"
  - Link it to current organization
  - User gets ADMIN permission
- Users can create additional vaults
- **Status**: User has at least one vault

### 5. Key Creation (Requires Vault)
- User can create keys ONLY within existing vaults
- Key belongs to the vault's organization
- **Status**: User has encryption keys

### 6. Secret Creation (Requires Key)
- User can create secrets using existing keys
- Secret inherits organization from the key
- Vault is automatically set from the key
- **Status**: User has encrypted secrets

## Implementation Steps

### Phase 1: Backend API Updates

#### 1.1 Onboarding System
- [ ] Add onboarding status to OrganizationMember model (already exists)
- [ ] Create onboarding middleware to track user progress
- [ ] Add endpoint: `GET /api/v1/auth/onboarding-status`
- [ ] Update registration to include onboarding state

#### 1.2 Organization Flow
- [ ] Update auth.wrapper to NOT auto-create organization on registration
- [ ] Add endpoint: `POST /api/v1/onboarding/organization` - create first org
- [ ] Add endpoint: `POST /api/v1/onboarding/join` - accept invitation
- [ ] Block dashboard access without organization

#### 1.3 Vault Auto-Creation
- [ ] Update organization creation to auto-create "Default Vault"
- [ ] Add endpoint: `POST /api/v1/onboarding/setup-vault` - ensure default vault
- [ ] Modify vault.wrapper to create default vault on first access

#### 1.4 Key/Secret Validation
- [ ] Add validation: Key creation requires vaultId
- [ ] Add validation: Secret creation requires keyId
- [ ] Auto-infer organizationId from key/vault relationships
- [ ] Update wrappers to enforce relationships

### Phase 2: Frontend Dashboard Updates

#### 2.1 Onboarding Flow
- [ ] Create onboarding wizard component
- [ ] Step 1: Organization setup (create or join)
- [ ] Step 2: Default vault confirmation
- [ ] Step 3: Quick tour/welcome
- [ ] Block dashboard access until onboarding complete

#### 2.2 Dashboard Guards
- [ ] Add route middleware to check organization membership
- [ ] Add vault existence check
- [ ] Show appropriate empty states

#### 2.3 Resource Creation Flow
- [ ] Update key creation form to require vault selection
- [ ] Update secret creation form to require key selection
- [ ] Auto-populate organization from context
- [ ] Show helpful tooltips about relationships

#### 2.4 Empty States & Guidance
- [ ] No organization: Show "Create Organization" prompt
- [ ] No vault: Show "Create Your First Vault" guide
- [ ] No keys: Show "Create Encryption Key" guide
- [ ] No secrets: Show "Store Your First Secret" guide

### Phase 3: API Endpoint Updates

#### New Endpoints
```
POST   /api/v1/onboarding/status          - Get user onboarding status
POST   /api/v1/onboarding/organization    - Create first organization
POST   /api/v1/onboarding/complete        - Mark onboarding complete
GET    /api/v1/auth/me                    - Get current user with org/vault info
```

#### Modified Endpoints
```
POST   /api/v1/auth/register              - Remove auto org creation
POST   /api/v1/organizations              - Auto-create default vault
POST   /api/v1/keys                       - Require vaultId, validate access
POST   /api/v1/secrets                    - Require keyId, auto-set org/vault
```

## Database Schema Updates

### OrganizationMember (Already exists)
```prisma
model OrganizationMember {
  // ... existing fields
  onboardingStatus  String   @default("in_progress")  // in_progress | completed
  onboardingStep    Int      @default(1)              // 1-3
  onboardingCompletedAt DateTime?
}
```

## Success Criteria

✅ User cannot access dashboard without organization
✅ First organization gets a default vault automatically
✅ Keys can only be created within vaults
✅ Secrets inherit organization from their key
✅ Clear onboarding flow guides new users
✅ API validates all relationships properly
✅ Empty states guide users to next action
✅ System works seamlessly with API endpoints

## Testing Checklist

- [ ] Register new user → blocked from dashboard
- [ ] Create organization → auto-creates default vault
- [ ] Try creating key without vault → blocked
- [ ] Create key with vault → succeeds
- [ ] Create secret with key → auto-sets org/vault
- [ ] API endpoints validate relationships
- [ ] Onboarding wizard works end-to-end
- [ ] Existing users are not affected
