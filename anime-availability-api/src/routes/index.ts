import { Router } from "express";
import seasonRouter from "./season.routes.js";
import searchRouter from "./search.routes.js";
import homeRouter from "./home.routes.js";
import { artworkRouter } from "./artwork.routes.js";

export const router = Router();

router.use("/season", seasonRouter);
router.use("/search", searchRouter);
router.get("/home/hero", homeRouter);
router.use(artworkRouter);

export default router;
