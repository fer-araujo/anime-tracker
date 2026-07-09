import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

export function requestId(req: Request, _res: Response, next: NextFunction) {
  req.requestId = randomUUID();
  next();
}
