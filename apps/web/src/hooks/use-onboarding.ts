/**
 * Onboarding Hooks
 * React Query hooks for onboarding operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  onboardingService,
  type CreateOrganizationData,
} from "@/services/onboarding.service";
import { toast } from "sonner";

type ApiErrorShape = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

/**
 * Get onboarding status
 */
export function useOnboardingStatus() {
  return useQuery({
    queryKey: ["onboarding", "status"],
    queryFn: () => onboardingService.getStatus(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Create first organization
 */
export function useCreateFirstOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationData) =>
      onboardingService.createOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "status"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization created successfully!");
    },
    onError: (error: unknown) => {
      const apiError = error as ApiErrorShape;
      toast.error(
        apiError?.response?.data?.message ||
          "Failed to create organization"
      );
    },
  });
}

/**
 * Complete onboarding
 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) =>
      onboardingService.completeOnboarding(organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "status"] });
      toast.success("Welcome! Your account is all set up.");
    },
    onError: (error: unknown) => {
      const apiError = error as ApiErrorShape;
      toast.error(
        apiError?.response?.data?.message || "Failed to complete onboarding"
      );
    },
  });
}
