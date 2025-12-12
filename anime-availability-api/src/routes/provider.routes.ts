// src/routes/provider.routes.ts
import { Router } from "express";
import { getAnimeProviders } from "../controllers/provider.controller.js";

const router = Router();

// GET /v1/anime/:anilistId/providers?country=MX
router.get("/:anilistId/providers", getAnimeProviders);

export default router;
