import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import router from "./routes/index.js";
import { requestId } from "./middleware/requestId.js";
import { httpLogger } from "./utils/logger.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();

// Comma-separated list of allowed origins, e.g. "https://anime-tracker.vercel.app,https://anime-tracker-git-preview.vercel.app"
// Falls back to allow-all outside production so local dev isn't broken by a missing env var.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions =
  process.env.NODE_ENV === "production" && allowedOrigins.length > 0
    ? {
        origin: allowedOrigins,
      }
    : {};

const apiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(requestId);
app.use(httpLogger);
app.use(express.json({ limit: "1mb" }));
app.use(compression());

// healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

// v1 API
app.use("/v1", apiRateLimit, router);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

export default app;
