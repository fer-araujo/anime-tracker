import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";

export function notFound(_req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Resource not found" },
  });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: req.requestId,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
      requestId: req.requestId,
    },
  });
}
