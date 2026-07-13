export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || "INTERNAL_ERROR";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class ExternalAPIError extends AppError {
  public readonly upstreamStatusCode?: number;

  constructor(
    message = "External API request failed",
    upstreamStatusCode?: number,
  ) {
    super(message, 502, "EXTERNAL_API_ERROR");
    this.upstreamStatusCode = upstreamStatusCode;
  }
}
