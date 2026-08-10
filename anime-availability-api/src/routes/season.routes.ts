import { Router } from "express";
import {
  getSeason,
  getSeasonArchive,
} from "../controllers/season.controller.js";
import validate from "../middleware/validate.js";
import { seasonQuerySchema } from "../models/schema.js";

const r = Router();

// Declared before "/" so the literal path is not swallowed by the validated
// root handler, which would reject `from`/`years` as unknown season params.
// GET /v1/season/archive?from=2026&years=6
r.get("/archive", getSeasonArchive);

// GET /v1/season?country=MX&season=FALL&year=2025
r.get("/", validate(seasonQuerySchema), getSeason);

export default r;
