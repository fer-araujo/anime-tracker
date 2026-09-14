import { Router } from "express";
import { z } from "zod";
import { getNotifications } from "../controllers/notifications.controller.js";

const router = Router();

/**
 * The watching list is the bound that matters. It is whatever the user has
 * marked, so it grows on its own, and this endpoint is polled on page load —
 * a cap keeps one enthusiastic library from turning every render into a large
 * request body.
 */
const bodySchema = z.object({
  animeIds: z.array(z.number().int().positive()).max(1000),
  since: z.string().min(1),
});

// POST /v1/notifications
router.post(
  "/",
  (req, res, next) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      });
    }
    req.validated = parsed.data;
    next();
  },
  getNotifications,
);

export default router;
