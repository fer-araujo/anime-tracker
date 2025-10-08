import { Router } from "express";
import seasonRouter from "./season.routes.js";
import searchRouter from "./search.routes.js";

const router = Router();

router.use("/season", seasonRouter);
router.use("/search", searchRouter);

export default router;
