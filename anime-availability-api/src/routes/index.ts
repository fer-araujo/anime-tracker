// src/routes/index.ts
import { Router } from "express";
import homeRoutes from "./home.routes.js";
import searchRoutes from "./search.routes.js";
import seasonRoutes from "./season.routes.js";
import artworkRouter from "./artwork.routes.js";
import providerRoutes from "./provider.routes.js";
import animeDetails from "./anime.routes.js";

const router = Router();

router.use("/", homeRoutes);
router.use("/search", searchRoutes);
router.use("/season", seasonRoutes);

router.use("/anime", animeDetails);

router.use("/anime", artworkRouter);
router.use("/anime", providerRoutes);

export default router;
