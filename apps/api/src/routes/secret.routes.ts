/**
 * Secret Routes
 * Endpoints for managing encrypted secrets with three-tier security
 */

import express from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../validators/validation.middleware";
import {
  createSecretSchema,
  revealSecretSchema,
  updateSecretSchema,
  getSecretsSchema,
} from "../validators/secret.validator";
import {
  createSecret,
  getSecrets,
  revealSecret,
  updateSecret,
  deleteSecret,
  getSecretVersions,
} from "../controllers/secret.controller";

const router = express.Router();

// Handle OPTIONS preflight requests before authentication
router.options("/:id/reveal", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, X-Device-Fingerprint, X-MFA-Token",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  });
  res.status(200).end();
});

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/secrets
 * @desc    Create a new encrypted secret
 * @access  Private (requires EDIT or ADMIN permission on vault)
 */
router.post("/", validate({ body: createSecretSchema }), createSecret);

/**
 * @route   GET /api/v1/secrets
 * @desc    Get all secrets in a vault (metadata only, no values)
 * @access  Private (requires VIEW permission on vault)
 */
router.get("/", validate({ query: getSecretsSchema }), getSecrets);

/**
 * @route   POST /api/v1/secrets/:id/reveal
 * @desc    Reveal secret value (requires password if protected)
 * @access  Private (requires USE permission + password if applicable)
 */
router.post(
  "/:id/reveal",
  validate({ body: revealSecretSchema }),
  revealSecret,
);

/**
 * @route   PUT /api/v1/secrets/:id
 * @desc    Update secret (creates new version)
 * @access  Private (requires EDIT or ADMIN permission)
 */
router.put("/:id", validate({ body: updateSecretSchema }), updateSecret);

/**
 * @route   DELETE /api/v1/secrets/:id
 * @desc    Delete a secret permanently
 * @access  Private (requires ADMIN permission)
 */
router.delete("/:id", deleteSecret);

/**
 * @route   GET /api/v1/secrets/:id/versions
 * @desc    Get secret version history
 * @access  Private (requires VIEW permission)
 */
router.get("/:id/versions", getSecretVersions);

export default router;
