import { Router } from "express";
import { z } from "zod";
import { getAnimeDetails } from "../controllers/anime.controller.js";

const router = Router();

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
