import { Router } from "express";
import { z } from "zod";
import { getAnimeDetails, getAnimeBatch } from "../controllers/anime.controller.js";

const router = Router();

// POST /v1/anime/batch — must come BEFORE /:id param middleware
router.post("/batch", (req, res, next) => {
  const parsed = z
    .object({ ids: z.array(z.number().int().positive()).min(1).max(50) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() },
    });
  }
  req.body = parsed.data;
  next();
}, getAnimeBatch);

// Validate that :id is a positive integer
router.use("/:id", (req, res, next) => {
  const result = z
    .object({ id: z.coerce.number().int().positive() })
    .safeParse(req.params);
  if (!result.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "id must be a positive integer",
      },
    });
    return;
  }
  next();
});

router.get("/:id", getAnimeDetails);

export default router;
