import { Router } from "express";
import * as shareController from "../controllers/share.controller";
import { authenticate } from "../middleware/auth";
import { requirePolicy } from "../middleware/policy";
import { authRateLimiter } from "../middleware/security";
import getPrismaClient from "../services/prisma.service";
import { NotFoundError, ErrorCode } from "@hermes/error-handling";

const router = Router();

const getKeyUrn = async (req: any) => {
  let orgId = req.headers["x-organization-id"] || req.query.orgId || req.body.orgId || req.query.organizationId || req.body.organizationId;
  const keyId = req.body.keyId;
  let vaultId;

  const prisma = getPrismaClient();

  if (keyId) {
    const key = await prisma.key.findUnique({ where: { id: keyId }, include: { vault: { select: { organizationId: true, id: true } } } });
    if (key && key.vault) {
      orgId = key.vault.organizationId;
      vaultId = key.vault.id;
      req.organizationId = orgId;
    } else {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Key not found");
    }
  }

  return `urn:hermes:org:${orgId || '*'}:vault:${vaultId || '*'}:key:${keyId || '*'}`;
};

/**
 * Public Routes
 */
router.get("/:token", shareController.getShareMetadata);
router.post("/:token/consume", authRateLimiter, shareController.consumeShare);

/**
 * Protected Routes
 */
router.use(authenticate);

// Create a new one-time share (Requires keys:use)
router.post("/", requirePolicy("keys:use", getKeyUrn), shareController.createShare);

export default router;
