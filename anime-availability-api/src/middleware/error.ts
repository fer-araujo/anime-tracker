import { NextFunction, Request, Response } from "express";

export function notFound(_req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({ error: "NOT_FOUND" });
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err?.status || 500).json({
    error: err?.code || "INTERNAL_ERROR",
    message: err?.message || "Something went wrong"
  });
}
