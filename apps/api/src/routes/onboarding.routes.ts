/**
 * Onboarding Routes
 * Routes for user onboarding flow
 */

import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as onboardingController from "../controllers/onboarding.controller";

const router = Router();

// All onboarding routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/onboarding/status
 * @desc    Get current user's onboarding status
 * @access  Private
 */
router.get("/status", onboardingController.getOnboardingStatus);

/**
 * @route   POST /api/v1/onboarding/organization
 * @desc    Create first organization during onboarding
 * @access  Private
 */
router.post("/organization", onboardingController.createFirstOrganization);

/**
 * @route   POST /api/v1/onboarding/complete
 * @desc    Mark onboarding as complete
 * @access  Private
 */
router.post("/complete", onboardingController.completeOnboarding);

export default router;
