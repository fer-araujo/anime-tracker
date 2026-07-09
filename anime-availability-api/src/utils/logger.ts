import pino from "pino";
import type { Request, Response, NextFunction } from "express";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  ...(isDev && {
    transport: {
      target: "pino/file",
      options: { destination: 1 },
    },
  }),
});

/** Express middleware that logs each request via pino */
export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      requestId: req.requestId,
    });
  });
  next();
}
