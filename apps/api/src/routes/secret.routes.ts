/**
 * Secret Routes
 * Endpoints for managing encrypted secrets with three-tier security
 */

import express, { type Request } from "express";
import { authenticate, requireOfficialCli } from "../middleware/auth";
import { requireVaultHealth } from "../middleware/vault-health";
import { requirePolicy } from "../middleware/policy";
import getPrismaClient from "../services/prisma.service";
import { validate } from "../validators/validation.middleware";
import { NotFoundError, ErrorCode } from "@hermit/error-handling";
import {
  buildGroupCandidateResourceUrns,
  buildSecretCandidateResourceUrns,
  buildSecretUrn,
} from "../services/iam-resource.service";
import {
  createSecretSchema,
  revealSecretSchema,
  updateSecretSchema,
  getSecretsSchema,
  bulkRevealSecretsSchema,
  secretIdParamSchema,
  setCurrentSecretVersionSchema,
} from "../validators/secret.validator";
import {
  createSecret,
  getSecret,
  getSecrets,
  revealSecret,
  updateSecret,
  deleteSecret,
  getSecretVersions,
  bulkRevealSecrets,
  setCurrentSecretVersion,
} from "../controllers/secret.controller";

const router = express.Router();

const getSecretUrn = async (req: Request & { organizationId?: string }) => {
  const secretId = req.params.id || req.body.secretId || req.query.secretId;
  const groupId = req.body.groupId || req.query.groupId;
  const secretIds = Array.isArray(req.body.secretIds) ? req.body.secretIds : [];
  const vaultId = req.body.vaultId || req.query.vaultId || req.params.vaultId;
  const search = req.body.search || req.query.search;

  const prisma = getPrismaClient();

  if (secretId) {
    const secret = await prisma.secret.findUnique({
      where: { id: secretId as string },
      include: {
        vault: { select: { organizationId: true, id: true } },
        group: { select: { path: true } },
      },
    });
    if (!secret || !secret.vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }
    req.organizationId = secret.vault.organizationId;
    return buildSecretCandidateResourceUrns({
      orgId: secret.vault.organizationId,
      vaultId: secret.vault.id,
      secretId: secret.id,
      groupPath: secret.group?.path,
    });
  }

  if (secretIds.length > 0) {
    const secrets = await prisma.secret.findMany({
      where: { id: { in: secretIds } },
      include: {
        vault: { select: { organizationId: true, id: true } },
        group: { select: { path: true } },
      },
    });

    if (secrets.length === 0) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Secret not found");
    }

    req.organizationId = secrets[0].vault.organizationId;

    return Array.from(
      new Set(
        secrets.flatMap((secret) =>
          buildSecretCandidateResourceUrns({
            orgId: secret.vault.organizationId,
            vaultId: secret.vault.id,
            secretId: secret.id,
            groupPath: secret.group?.path,
          }),
        ),
      ),
    );
  }

  if (groupId) {
    const group = await prisma.group.findUnique({
      where: { id: groupId as string },
      include: { vault: { select: { organizationId: true, id: true } } },
    });
    if (!group || !group.vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Group not found");
    }
    req.organizationId = group.vault.organizationId;
    return [
      buildSecretUrn(group.vault.organizationId, group.vault.id, "*"),
      ...buildGroupCandidateResourceUrns({
        orgId: group.vault.organizationId,
        vaultId: group.vault.id,
        groupId: group.id,
        path: group.path,
      }),
    ];
  }

  if (vaultId) {
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId as string },
      select: { organizationId: true },
    });
    if (!vault) {
      throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, "Vault not found");
    }
    req.organizationId = vault.organizationId;

    const matchingSecrets = await prisma.secret.findMany({
      where: {
        vaultId: vaultId as string,
        ...(typeof search === "string" && search.trim().length > 0
          ? {
              OR: [
                { id: { startsWith: search.trim() } },
                { name: { contains: search.trim(), mode: "insensitive" } },
                { description: { contains: search.trim(), mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        group: {
          select: {
            path: true,
          },
        },
      },
    });

    return Array.from(
      new Set([
        buildSecretUrn(vault.organizationId, vaultId as string, "*"),
        ...matchingSecrets.flatMap((secret) =>
          buildSecretCandidateResourceUrns({
            orgId: vault.organizationId,
            vaultId: vaultId as string,
            secretId: secret.id,
            groupPath: secret.group?.path,
          }),
        ),
      ]),
    );
  }

  return "urn:hermit:org:*:vault:*:secret:*";
};

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

router.use(authenticate);
router.use(requireVaultHealth);

router.post(
  "/",
  validate({ body: createSecretSchema }),
  requirePolicy("secrets:create", getSecretUrn),
  createSecret,
);
router.get(
  "/",
  validate({ query: getSecretsSchema }),
  async (req, res, next) => {
    if (req.query.cliScope === "true") {
      return requireOfficialCli(req, res, () =>
        requirePolicy(["secrets:read", "secrets:cli-use"], getSecretUrn)(req, res, next),
      );
    }

    return requirePolicy("secrets:read", getSecretUrn)(req, res, next);
  },
  getSecrets,
);
router.get(
  "/:id",
  validate({ params: secretIdParamSchema }),
  requirePolicy("secrets:read", getSecretUrn),
  getSecret,
);
router.post(
  "/bulk-reveal",
  validate({ body: bulkRevealSecretsSchema }),
  requirePolicy("secrets:use", getSecretUrn),
  bulkRevealSecrets,
);
router.post(
  "/cli/bulk-reveal",
  validate({ body: bulkRevealSecretsSchema }),
  requireOfficialCli,
  requirePolicy(["secrets:use", "secrets:cli-use"], getSecretUrn),
  (req, _res, next) => {
    req.body.cliScope = true;
    next();
  },
  bulkRevealSecrets,
);
router.post(
  "/:id/reveal",
  validate({ params: secretIdParamSchema, body: revealSecretSchema }),
  requirePolicy("secrets:use", getSecretUrn),
  revealSecret,
);
router.post(
  "/:id/cli-reveal",
  validate({ params: secretIdParamSchema, body: revealSecretSchema }),
  requireOfficialCli,
  requirePolicy(["secrets:use", "secrets:cli-use"], getSecretUrn),
  (req, _res, next) => {
    req.body.cliScope = true;
    next();
  },
  revealSecret,
);
router.put(
  "/:id",
  validate({ params: secretIdParamSchema, body: updateSecretSchema }),
  requirePolicy("secrets:update", getSecretUrn),
  updateSecret,
);
router.delete(
  "/:id",
  validate({ params: secretIdParamSchema }),
  requirePolicy("secrets:delete", getSecretUrn),
  deleteSecret,
);
router.get(
  "/:id/versions",
  validate({ params: secretIdParamSchema }),
  requirePolicy("secrets:read", getSecretUrn),
  getSecretVersions,
);
router.post(
  "/:id/current-version",
  validate({ params: secretIdParamSchema, body: setCurrentSecretVersionSchema }),
  requirePolicy("secrets:update", getSecretUrn),
  setCurrentSecretVersion,
);

export default router;
