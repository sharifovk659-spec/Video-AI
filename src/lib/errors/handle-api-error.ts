import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, isAppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: error.flatten(),
        },
      },
      { status: 422 },
    );
  }

  if (isAppError(error)) {
    if (!error.expose) {
      logger.error("AppError (internal)", {
        code: error.code,
        message: error.message,
      });
    }
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.expose ? error.message : "Internal server error",
          details: error.expose ? error.details : undefined,
        },
      },
      { status: error.status },
    );
  }

  logger.error("Unhandled API error", {
    message: error instanceof Error ? error.message : String(error),
  });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
    { status: 500 },
  );
}

export function assertFound<T>(
  value: T | null | undefined,
  message = "Resource not found",
): T {
  if (value == null) {
    throw new AppError("NOT_FOUND", message);
  }
  return value;
}
