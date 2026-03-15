import type { Request, Response } from "express";
import { asyncHandler, AuthenticationError, ErrorCode } from "@hermit/error-handling";
import { secretGroupWrapper } from "../wrappers/secret-group.wrapper";

/**
 * Create a new Secret Group
 * POST /api/v1/vaults/:vaultId/groups
 */
export const createGroup = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await secretGroupWrapper.createGroup(
      req.user.id,
      {
        vaultId: req.params.vaultId || req.body.vaultId,
        ...req.body,
      },
      {
        ipAddress: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      }
    );

    res.status(201).json({
      success: true,
      data: result,
      message: "Secret Group created successfully",
    });
  }
);

/**
 * Get all Secret Groups in a vault
 * GET /api/v1/vaults/:vaultId/groups
 */
export const getGroups = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await secretGroupWrapper.getGroups(
      req.user.id,
      {
        vaultId: req.params.vaultId || req.query.vaultId as string,
        parentId: req.query.parentId as string | undefined,
        includeChildren: req.query.includeChildren === "true",
        forPolicyBuilder: req.query.forPolicyBuilder === "true",
      }
    );

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * Update a Secret Group
 * PUT /api/v1/vaults/:vaultId/groups/:groupId
 */
export const updateGroup = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await secretGroupWrapper.updateGroup(
      req.user.id,
      {
        groupId: req.params.groupId,
        ...req.body,
      },
      {
        ipAddress: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      }
    );

    res.json({
      success: true,
      data: result,
      message: "Secret Group updated successfully",
    });
  }
);

/**
 * Delete a Secret Group
 * DELETE /api/v1/vaults/:vaultId/groups/:groupId
 */
export const deleteGroup = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    await secretGroupWrapper.deleteGroup(
      req.user.id,
      { groupId: req.params.groupId },
      {
        ipAddress: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      }
    );

    res.json({
      success: true,
      message: "Secret Group deleted successfully",
    });
  }
);


