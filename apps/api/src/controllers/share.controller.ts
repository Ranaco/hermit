import type { Request, Response } from "express";
import { asyncHandler, AuthenticationError, ErrorCode, ValidationError } from "@hermes/error-handling";
import { shareWrapper } from "../wrappers/share.wrapper";

/**
 * Share Controller
 * Handles One-Time Secret Sharing endpoints
 */

export const createShare = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError(ErrorCode.UNAUTHORIZED);
  }

  // Value or secretId, keyId, and token constraints
  const { keyId, value, secretId, passphrase, expiresInHours, note, audienceEmail } = req.body;

  if (!keyId) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Encryption keyId is required");
  }

  const result = await shareWrapper.createShare(
    req.user.id,
    { keyId, value, secretId, passphrase, expiresInHours, note, audienceEmail },
    {
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    }
  );

  res.status(201).json({
    success: true,
    data: result,
    message: "Share created successfully",
  });
});

export const getShareMetadata = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  
  if (!token) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Share token is required");
  }

  const result = await shareWrapper.getShareMetadata(token);

  if (result.status !== "active") {
    // We return 200 OK but with the status indicating it's no longer available.
    return res.json({
      success: true,
      data: { status: result.status }
    });
  }

  res.json({
    success: true,
    data: result,
  });
});

export const consumeShare = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { passphrase } = req.body;

  if (!token) {
    throw new ValidationError(ErrorCode.VALIDATION_ERROR, "Share token is required");
  }

  // Note: the wrapper throws ErrorCode.INVALID_CREDENTIALS / RESOURCE_EXPIRED etc.
  // which Express' errorHandler middleware will convert into the correct 401/403/404.
  const result = await shareWrapper.consumeShare(
    token, 
    passphrase,
    {
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    }
  );

  res.json({
    success: true,
    data: result,
    message: "Share consumed successfully. This link is no longer valid.",
  });
});
