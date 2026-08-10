import { Router } from "express";
import { getSchedule } from "../controllers/schedule.controller.js";

const r = Router();

// GET /v1/schedule?type=airing|coming|tba&days=1|7
r.get("/", getSchedule);

export default r;
