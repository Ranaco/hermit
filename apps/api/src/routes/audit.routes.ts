import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../validators/validation.middleware";
import { asyncHandler } from "@hermit/error-handling";
import { getAuditLogsSchema } from "../validators/audit.validator";
import { getAuditLogs } from "../controllers/audit.controller";

const router = Router();

// Retrieve audit logs
router.get(
  "/",
  authenticate,
  validate({ query: getAuditLogsSchema }),
  asyncHandler(getAuditLogs),
);

export default router;
