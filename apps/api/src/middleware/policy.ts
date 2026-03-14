import type { Request, Response, NextFunction } from "express";
import { AuthenticationError, ErrorCode, asyncHandler } from "@hermes/error-handling";
import { evaluateAccess, evaluateAccessAgainstAny } from "../services/policy-engine";

export type ResourceUrnFactory = (
  req: Request,
) => string | string[] | Promise<string | string[]>;

export function requirePolicy(actions: string | string[], resourceFactory: ResourceUrnFactory) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const resourceFactoryResult = await resourceFactory(req);
    const resourceUrns = Array.isArray(resourceFactoryResult)
      ? resourceFactoryResult
      : [resourceFactoryResult];

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
      const hasAccess =
        resourceUrns.length > 1
          ? await evaluateAccessAgainstAny(req.user.id, orgId, action, resourceUrns)
          : await evaluateAccess(req.user.id, orgId, action, resourceUrns[0]);

      if (hasAccess) {
        return next();
      }
    }

    throw new AuthenticationError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      "Access denied by implicit or explicit IAM policies.",
    );
  });
}
