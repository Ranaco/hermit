import type { Request, Response, NextFunction } from "express";
import { AuthenticationError, ErrorCode, asyncHandler } from "@hermes/error-handling";
import { evaluateAccess } from "../services/policy-engine";

export type ResourceUrnFactory = (req: Request) => string | Promise<string>;

export function requirePolicy(actions: string | string[], resourceFactory: ResourceUrnFactory) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const resourceUrn = await resourceFactory(req);

    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const orgId =
      (req as Request & { organizationId?: string }).organizationId ||
      req.params.orgId ||
      (req.query.orgId as string | undefined) ||
      (req.body.orgId as string | undefined) ||
      (req.query.organizationId as string | undefined) ||
      (req.body.organizationId as string | undefined);

    if (!orgId) {
      throw new AuthenticationError(ErrorCode.VALIDATION_ERROR, "Organization context is required for policy execution");
    }

    const actionList = Array.isArray(actions) ? actions : [actions];

    for (const action of actionList) {
      if (await evaluateAccess(req.user.id, orgId, action, resourceUrn)) {
        return next();
      }
    }

    throw new AuthenticationError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      `Access denied by implicit or explicit IAM policies on resource '${resourceUrn}'`,
    );
  });
}
