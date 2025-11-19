import { Router } from "express";
import { getArtwork } from "../controllers/artwork.controller.js";

export const artworkRouter = Router();
artworkRouter.get("/artwork/:tmdbId", getArtwork);