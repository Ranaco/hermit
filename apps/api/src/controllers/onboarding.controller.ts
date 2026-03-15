/**
 * Onboarding Controller
 * Handles user onboarding flow and organization setup
 */

import type { Request, Response } from "express";
import {
  asyncHandler,
  AuthenticationError,
  ValidationError,
  ErrorCode,
  NotFoundError,
} from "@hermit/error-handling";
import { onboardingWrapper } from "../wrappers/onboarding.wrapper";

/**
 * Get onboarding status for current user
 * GET /api/v1/onboarding/status
 */
export const getOnboardingStatus = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await onboardingWrapper.getOnboardingStatus(req.user.id);

    res.json({
      success: true,
      data: result,
    });
  },
);

/**
 * Create first organization during onboarding
 * POST /api/v1/onboarding/organization
 */
export const createFirstOrganization = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const { name, description } = req.body;

    if (!name) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Organization name is required",
      );
    }

    const result = await onboardingWrapper.createFirstOrganization(
      req.user.id,
      { name, description },
      {
        ipAddress: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      },
    );

    res.status(201).json({
      success: true,
      data: result,
      message: "Organization created successfully with default vault",
    });
  },
);

/**
 * Complete onboarding
 * POST /api/v1/onboarding/complete
 */
export const completeOnboarding = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const { organizationId } = req.body;

    if (!organizationId) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Organization ID is required",
      );
    }

    const result = await onboardingWrapper.completeOnboarding(
      req.user.id,
      organizationId,
    );

    res.json({
      success: true,
      data: result,
      message: "Onboarding completed successfully",
    });
  },
);
