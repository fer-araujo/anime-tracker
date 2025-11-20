import { Router } from "express";
import { getHomeHero } from "../controllers/home.controller.js";

const r = Router();

r.get("/home/hero", getHomeHero);

export default r;
