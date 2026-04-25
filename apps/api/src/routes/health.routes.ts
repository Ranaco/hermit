import { Router } from "express";
import { healthCheck, statusCheck } from "../controllers/health.controller";

const router = Router();

/**
 * @route   GET /health
 * @desc    Basic health check
 * @access  Public
 */
router.get("/health", healthCheck);

/**
 * @route   GET /status
 * @desc    Detailed status check
 * @access  Public
 */
router.get("/status", statusCheck);

export default router;
