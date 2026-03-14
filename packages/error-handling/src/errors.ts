import { ErrorCode, ErrorMessages, HttpStatusCodes } from "./error-codes";

/**
 * Base Application Error
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: unknown,
    isOperational: boolean = true,
  ) {
    super(message || ErrorMessages[code]);

    this.code = code;
    this.statusCode = HttpStatusCodes[code] || 500;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);

    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV !== "production" && { stack: this.stack }),
    };
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    message?: string,
    details?: unknown,
  ) {
    super(code, message, details);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.INSUFFICIENT_PERMISSIONS,
    message?: string,
    details?: unknown,
  ) {
    super(code, message, details);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Forbidden Error (alias for AuthorizationError)
 */
export class ForbiddenError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.INSUFFICIENT_PERMISSIONS,
    message?: string,
    details?: unknown,
  ) {
    super(code, message, details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(
    messageOrCode?: string | ErrorCode,
    detailsOrMessage?: unknown,
    code: ErrorCode = ErrorCode.VALIDATION_ERROR,
  ) {
    const isErrorCode =
      typeof messageOrCode === "string" &&
      Object.values(ErrorCode).includes(messageOrCode as ErrorCode);

    const resolvedCode = isErrorCode ? (messageOrCode as ErrorCode) : code;
    const resolvedMessage = isErrorCode
      ? (typeof detailsOrMessage === "string" ? detailsOrMessage : undefined)
      : messageOrCode;
    const resolvedDetails = isErrorCode
      ? typeof detailsOrMessage === "string"
        ? undefined
        : detailsOrMessage
      : detailsOrMessage;

    super(resolvedCode, resolvedMessage, resolvedDetails);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(code: ErrorCode | string, message?: string, details?: unknown) {
    if (
      typeof code === "string" &&
      !Object.values(ErrorCode).includes(code as ErrorCode)
    ) {
      super(ErrorCode.KEY_NOT_FOUND, `${code} not found`, message);
    } else {
      super(code as ErrorCode, message, details);
    }
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends AppError {
  constructor(
    messageOrCode: string | ErrorCode,
    detailsOrMessage?: unknown,
    code: ErrorCode = ErrorCode.KEY_ALREADY_EXISTS,
  ) {
    const isErrorCode =
      typeof messageOrCode === "string" &&
      Object.values(ErrorCode).includes(messageOrCode as ErrorCode);

    const resolvedCode = isErrorCode ? (messageOrCode as ErrorCode) : code;
    const resolvedMessage = isErrorCode
      ? (typeof detailsOrMessage === "string" ? detailsOrMessage : undefined)
      : messageOrCode;
    const resolvedDetails = isErrorCode
      ? typeof detailsOrMessage === "string"
        ? undefined
        : detailsOrMessage
      : detailsOrMessage;

    super(resolvedCode, resolvedMessage, resolvedDetails);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number, details?: unknown) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, undefined, details);
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Vault Service Error
 */
export class VaultError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.VAULT_TRANSIT_ERROR,
    message?: string,
    details?: unknown,
  ) {
    super(code, message, details);
    Object.setPrototypeOf(this, VaultError.prototype);
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message?: string, details?: unknown) {
    super(ErrorCode.DATABASE_ERROR, message, details, false);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string, details?: unknown) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      message || `${service} service error`,
      details,
      false,
    );
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}
