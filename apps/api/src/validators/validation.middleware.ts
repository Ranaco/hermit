/**
 * Validation Middleware
 * Validates request body, query, and params using Zod schemas
 */

import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { ValidationError, ErrorCode } from "@hermit/error-handling";

export interface ValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

/**
 * Validate request using Zod schemas
 */
export const validate = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }

      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        return next(new ValidationError(ErrorCode.VALIDATION_ERROR, messages));
      }
      return next(error);
    }
  };
};
