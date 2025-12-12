import { Router } from "express";
import { getArtwork } from "../controllers/artwork.controller.js";

const router = Router();

// GET /v1/anime/:tmdbId/artwork
router.get("/:tmdbId/artwork", getArtwork);

export default router;
