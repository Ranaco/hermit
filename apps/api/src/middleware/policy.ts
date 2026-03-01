import type { Request, Response, NextFunction } from "express";
import { AuthenticationError, ErrorCode, asyncHandler } from "@hermes/error-handling";
import { evaluateAccess } from "../services/policy-engine";

export type ResourceUrnFactory = (req: Request) => string | Promise<string>;

/**
 * Validates whether the authenticated user has explicit ALLOW (and no DENY) via
 * JSON IAM Policies for the given specific action on the computed resource URN.
 *
 * @param actions - e.g. "secrets:read" or ["groups:read", "secrets:read"]
 * @param resourceFactory - A callback generating the canonical URN for the req resource.
 */
export function requirePolicy(actions: string | string[], resourceFactory: ResourceUrnFactory) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    // Evaluate URN first which can optionally populate `req.organizationId`
    const resourceUrn = await resourceFactory(req);

    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }
    
    const orgId = req.headers["x-organization-id"] as string || req.query.orgId as string || req.body.orgId as string || req.query.organizationId as string || req.body.organizationId as string || (req as any).organizationId as string;

    if (!orgId) {
      throw new AuthenticationError(ErrorCode.VALIDATION_ERROR, "Organization Context Required for Policy Execution");
    }


    const actionList = Array.isArray(actions) ? actions : [actions];
    let isAllowed = false;

    for (const action of actionList) {
      if (await evaluateAccess(req.user.id, orgId, action, resourceUrn)) {
        isAllowed = true;
        break;
      }
    }

    if (isAllowed) {
      return next();
    }

    throw new AuthenticationError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      `Access denied by implicit or explicit IAM policies on resource '${resourceUrn}'`
    );
  });
}
