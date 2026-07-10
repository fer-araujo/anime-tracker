import { Router } from "express";
import { getSchedule } from "../controllers/schedule.controller.js";

const r = Router();

r.get("/", getSchedule);

export default r;
