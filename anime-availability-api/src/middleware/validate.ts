import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export default function validate<T extends ZodSchema<any>>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten()
      });
    }
    req.validated = parsed.data;
    next();
  };
}
