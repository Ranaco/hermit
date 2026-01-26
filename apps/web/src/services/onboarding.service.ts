/**
 * Onboarding Service
 * API client for user onboarding operations
 */

import { apiClient } from "@/lib/api";

export interface OnboardingStatus {
  hasOrganization: boolean;
  hasVault: boolean;
  onboardingComplete: boolean;
  currentStep: number;
  organization: {
    id: string;
    name: string;
    role: string;
  } | null;
}

export interface CreateOrganizationData {
  name: string;
  description?: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vault {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export const onboardingService = {
  /**
   * Get current user's onboarding status
   */
  async getStatus(): Promise<OnboardingStatus> {
    const response = await apiClient.get<{ data: OnboardingStatus }>(
      "/onboarding/status"
    );
    return response.data.data;
  },

  /**
   * Create first organization during onboarding
   */
  async createOrganization(
    data: CreateOrganizationData
  ): Promise<{ organization: Organization; vault: Vault }> {
    const response = await apiClient.post<{
      data: { organization: Organization; vault: Vault };
    }>("/onboarding/organization", data);
    return response.data.data;
  },

  /**
   * Complete onboarding process
   */
  async completeOnboarding(organizationId: string): Promise<void> {
    await apiClient.post("/onboarding/complete", { organizationId });
  },
};
