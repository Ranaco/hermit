import { Router, type Request } from "express";
import * as shareController from "../controllers/share.controller";
import { authenticate } from "../middleware/auth";
import { requirePolicy } from "../middleware/policy";
import { authRateLimiter } from "../middleware/security";
import getPrismaClient from "../services/prisma.service";
import { NotFoundError, ErrorCode } from "@hermit/error-handling";

const router = Router();

const getKeyUrn = async (req: Request & { organizationId?: string }) => {
  const keyId = req.body.keyId || req.query.keyId || req.params.keyId;
  const prisma = getPrismaClient();

  if (keyId) {
    const key = await prisma.key.findUnique({ where: { id: keyId }, include: { vault: { select: { organizationId: true, id: true } } } });
    if (!key || !key.vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Key not found");
    }
    req.organizationId = key.vault.organizationId;
    return `urn:hermit:org:${key.vault.organizationId}:vault:${key.vault.id}:key:${keyId}`;
  }

  return "urn:hermit:org:*:vault:*:key:*";
};

router.get("/:token", shareController.getShareMetadata);
router.post("/:token/consume", authRateLimiter, shareController.consumeShare);

router.use(authenticate);

router.post("/", requirePolicy("keys:use", getKeyUrn), shareController.createShare);

export default router;
