# Frontend Implementation Guide

## Quick Start: Remaining Tasks

This guide will help you complete the frontend implementation for the onboarding flow.

## Phase 1: Create Onboarding Page

### 1. Create the Onboarding Page Route

Create `apps/web/src/app/onboarding/page.tsx`:

```tsx
"use client";

import { OnboardingWizard } from "@/components/onboarding-wizard";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: status, isLoading } = useOnboardingStatus();

  useEffect(() => {
    // Redirect to dashboard if onboarding is already complete
    if (status?.onboardingComplete) {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status?.onboardingComplete) {
    return null; // Will redirect
  }

  return <OnboardingWizard />;
}
```

## Phase 2: Add Route Protection

### 2. Create Auth Guard Hook

Create `apps/web/src/hooks/use-auth-guard.ts`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStatus } from "./use-onboarding";
import { useAuth } from "./use-auth"; // Assuming this exists

export function useAuthGuard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data: onboarding, isLoading: onboardingLoading } = useOnboardingStatus();

  useEffect(() => {
    if (authLoading || onboardingLoading) return;

    // Not logged in → redirect to login
    if (!user) {
      router.push("/login");
      return;
    }

    // Logged in but onboarding not complete → redirect to onboarding
    if (!onboarding?.onboardingComplete) {
      router.push("/onboarding");
      return;
    }
  }, [user, onboarding, authLoading, onboardingLoading, router]);

  return {
    isReady: !authLoading && !onboardingLoading && user && onboarding?.onboardingComplete,
    isLoading: authLoading || onboardingLoading,
  };
}
```

### 3. Update Dashboard Layout

Modify `apps/web/src/app/dashboard/layout.tsx`:

```tsx
"use client";

import { useAuthGuard } from "@/hooks/use-auth-guard";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isReady, isLoading } = useAuthGuard();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isReady) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
```

## Phase 3: Update Auth Flow

### 4. Update Login/Register Pages

After successful login/register, check onboarding status:

In your login success handler (e.g., `apps/web/src/app/login/page.tsx`):

```tsx
const handleLogin = async (credentials: LoginCredentials) => {
  try {
    const result = await authService.login(credentials);
    
    // Store tokens
    localStorage.setItem("accessToken", result.tokens.accessToken);
    localStorage.setItem("refreshToken", result.tokens.refreshToken);
    
    // Check if user has organization
    if (!result.organization) {
      router.push("/onboarding");
    } else {
      router.push("/dashboard");
    }
  } catch (error) {
    // Handle error
  }
};
```

Similarly for register success.

## Phase 4: Empty States & Guidance

### 5. Create Empty State Component

Create `apps/web/src/components/empty-state.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 p-4 bg-muted/50 rounded-full">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

### 6. Update Dashboard Page with Empty States

Update `apps/web/src/app/dashboard/page.tsx`:

```tsx
import { EmptyState } from "@/components/empty-state";
import { Vault, Key, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

// In your component:
const router = useRouter();

// For vaults empty state:
{vaults?.length === 0 && (
  <EmptyState
    icon={Vault}
    title="No Vaults Yet"
    description="Create your first vault to start storing encryption keys"
    actionLabel="Create Vault"
    onAction={() => router.push("/dashboard/vaults")}
  />
)}

// For keys empty state:
{keys?.length === 0 && currentVault && (
  <EmptyState
    icon={Key}
    title="No Keys in This Vault"
    description="Create an encryption key to start securing your secrets"
    actionLabel="Create Key"
    onAction={() => router.push("/dashboard/keys")}
  />
)}
```

## Phase 5: Update Forms

### 7. Update Vault Creation Form

Ensure the vault creation form includes organizationId:

```tsx
// In your vault creation component
const { currentOrganization } = useOrganizationStore();

const handleCreateVault = async (data: { name: string; description?: string }) => {
  if (!currentOrganization) {
    toast.error("Please select an organization first");
    return;
  }

  await vaultService.create({
    ...data,
    organizationId: currentOrganization.id, // ← Required
  });
};
```

### 8. Update Key Creation Form

Ensure the key creation form requires vault selection:

```tsx
// In your key creation component
const { currentVault } = useOrganizationStore();

const handleCreateKey = async (data: { name: string; description?: string }) => {
  if (!currentVault) {
    toast.error("Please select a vault first");
    return;
  }

  await keyService.create({
    ...data,
    vaultId: currentVault.id, // ← Required
  });
};
```

### 9. Update Secret Creation Form

Ensure the secret creation form requires key selection:

```tsx
// In your secret creation component
import { useKeys } from "@/hooks/use-keys";

const { currentVault } = useOrganizationStore();
const { data: keys } = useKeys(currentVault?.id);

// Form should have a key selector:
<Select name="keyId" required>
  <SelectTrigger>
    <SelectValue placeholder="Select encryption key" />
  </SelectTrigger>
  <SelectContent>
    {keys?.map((key) => (
      <SelectItem key={key.id} value={key.id}>
        {key.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Phase 6: Add Helpful Tooltips

### 10. Add Info Tooltips to Forms

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

// In your forms:
<Label className="flex items-center gap-2">
  Vault
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="h-4 w-4 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Keys belong to a vault within your organization</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</Label>
```

## Testing Checklist

Once implemented, test this flow:

### Test 1: New User Flow
1. ✅ Register new user
2. ✅ Should redirect to `/onboarding` (not dashboard)
3. ✅ Create organization in wizard
4. ✅ Should auto-create "Default Vault"
5. ✅ Complete onboarding
6. ✅ Should redirect to `/dashboard`
7. ✅ Dashboard should show organization and vault

### Test 2: Dashboard Access
1. ✅ Try accessing `/dashboard` before onboarding → redirect to `/onboarding`
2. ✅ Try accessing `/dashboard` after onboarding → allow access
3. ✅ Dashboard shows correct empty states

### Test 3: Resource Creation
1. ✅ Try creating vault without organization → show error
2. ✅ Create vault with organization → success
3. ✅ Try creating key without vault → show error
4. ✅ Create key with vault → success
5. ✅ Try creating secret without key → show error
6. ✅ Create secret with key → success, auto-sets vault/org

### Test 4: API Validation
1. ✅ POST `/api/v1/vaults` without `organizationId` → 400 error
2. ✅ POST `/api/v1/keys` without `vaultId` → 400 error
3. ✅ POST `/api/v1/secrets` without `keyId` → 400 error

## Common Issues & Solutions

### Issue: Infinite redirect loop
**Solution**: Check that `useAuthGuard` properly handles loading states and doesn't redirect while loading.

### Issue: User can't create vault
**Solution**: Ensure `currentOrganization` is properly set in the store after onboarding.

### Issue: Default vault not showing up
**Solution**: Refresh queries after onboarding completion:
```tsx
queryClient.invalidateQueries({ queryKey: ["vaults"] });
```

### Issue: Form validation errors
**Solution**: Add proper error handling and display validation messages:
```tsx
if (!organizationId) {
  toast.error("Organization is required. Please select an organization.");
  return;
}
```

## Additional Enhancements (Optional)

1. **Onboarding Skip for Invited Users**: Allow users invited to an organization to skip org creation
2. **Multi-Organization Support**: Allow users to switch between organizations
3. **Onboarding Tour**: Add a product tour after onboarding completion
4. **Progress Persistence**: Save onboarding progress to allow users to resume
5. **Animations**: Add smooth transitions between onboarding steps

## Summary

After completing these steps, your system will have:
- ✅ Proper user onboarding flow
- ✅ Required organization before dashboard access
- ✅ Auto-created default vault for each organization
- ✅ Enforced resource hierarchy (Org → Vault → Key → Secret)
- ✅ Clear empty states guiding users
- ✅ Proper validation at all levels
- ✅ Seamless API integration

The system will work perfectly with both the web dashboard and direct API calls!
