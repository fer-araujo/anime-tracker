import { Router } from "express";
import { getAnimeDetails } from "../controllers/anime.controller.js";
// Importa el controlador nuevo

const router = Router();

router.get("/:id", getAnimeDetails);

export default router;