import { Router } from "express";
import { searchTitle } from "../controllers/search.controller.js";
import validate from "../middleware/validate.js";
import { searchQuerySchema } from "../models/schema.js";

const r = Router();

// GET /v1/search?title=Solo%20Leveling&country=MX
r.get("/", validate(searchQuerySchema), searchTitle);

export default r;
