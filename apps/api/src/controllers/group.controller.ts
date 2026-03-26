import type { Request, Response } from "express";
import { asyncHandler, AuthenticationError, ErrorCode } from "@hermit/error-handling";
import { groupWrapper } from "../wrappers/group.wrapper";

/**
 * Create a new Group
 * POST /api/v1/vaults/:vaultId/groups
 */
export const createGroup = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await groupWrapper.createGroup(
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
      message: "Group created successfully",
    });
  }
);

/**
 * Get all Groups in a vault
 * GET /api/v1/vaults/:vaultId/groups
 */
export const getGroups = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await groupWrapper.getGroups(
      req.user.id,
      {
        vaultId: req.params.vaultId || req.query.vaultId as string,
        parentId: req.query.parentId as string | undefined,
        includeChildren: req.query.includeChildren === "true",
        forPolicyBuilder: req.query.forPolicyBuilder === "true",
        cliScope: req.query.cliScope === "true",
      }
    );

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * Update a Group
 * PUT /api/v1/vaults/:vaultId/groups/:groupId
 */
export const updateGroup = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    const result = await groupWrapper.updateGroup(
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
      message: "Group updated successfully",
    });
  }
);

/**
 * Delete a Group
 * DELETE /api/v1/vaults/:vaultId/groups/:groupId
 */
export const deleteGroup = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
    }

    await groupWrapper.deleteGroup(
      req.user.id,
      { groupId: req.params.groupId },
      {
        ipAddress: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      }
    );

    res.json({
      success: true,
      message: "Group deleted successfully",
    });
  }
);
