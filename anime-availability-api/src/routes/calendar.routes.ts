import { Router } from "express";
import { z } from "zod";
import { getCalendar } from "../controllers/calendar.controller.js";

const router = Router();

/**
 * A week of either side is what the timetable answers reliably. The id cap
 * matches the notifications endpoint: this list grows on its own as the user
 * tracks more, so it needs a ceiling even though the query cost does not rise.
 */
const bodySchema = z.object({
  animeIds: z.array(z.number().int().positive()).max(1000),
  week: z.union([z.literal(-1), z.literal(0), z.literal(1)]).default(0),
});

// POST /v1/calendar
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
  getCalendar,
);

export default router;
