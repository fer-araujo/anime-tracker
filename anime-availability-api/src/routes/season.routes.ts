import { Router } from "express";
import { getSeason } from "../controllers/season.controller.js";
import validate from "../middleware/validate.js";
import { seasonQuerySchema } from "../models/schema.js";

const r = Router();

// GET /v1/season?country=MX&season=FALL&year=2025
r.get("/", validate(seasonQuerySchema), getSeason);

export default r;
