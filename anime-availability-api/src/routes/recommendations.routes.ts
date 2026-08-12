import { Router } from "express";
import { z } from "zod";
import { getRecommendations } from "../controllers/recommendations.controller.js";

const router = Router();

const animeId = z.number().int().positive();

/**
 * Bounds are here rather than only in the controller so an oversized body is
 * rejected before it reaches any handler. The exclusion list is the one that
 * grows without the user noticing — it carries everything they have ever
 * tracked, listed or dismissed — so it gets the loosest cap of the three and
 * still has one.
 */
const bodySchema = z.object({
  seeds: z
    .array(
      z.object({
        animeId,
        favorite: z.boolean(),
        score: z.number().min(0).max(10).nullable(),
      }),
    )
    .max(500),
  exclude: z.array(animeId).max(5000).default([]),
  completed: z.array(animeId).max(5000).default([]),
  country: z.string().length(2).optional(),
});

// POST /v1/recommendations
router.post("/", (req, res, next) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() },
    });
  }
  req.validated = parsed.data;
  next();
}, getRecommendations);

export default router;
