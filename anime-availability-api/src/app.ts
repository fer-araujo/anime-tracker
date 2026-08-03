import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import router from "./routes/index.js";
import { requestId } from "./middleware/requestId.js";
import { httpLogger, logger } from "./utils/logger.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { isOriginAllowed, parseAllowedOrigins } from "./utils/cors.js";

const app = express();

// Render (like most PaaS) puts a proxy in front of the app. Without this,
// req.ip is the proxy's address, so express-rate-limit buckets EVERY client
// together and the limit becomes global instead of per-user.
// Must be a number (hop count), not `true` — see express-rate-limit docs.
app.set("trust proxy", 1);

/**
 * Comma-separated allowlist, e.g.
 *   ALLOWED_ORIGINS="https://anime-tracker.vercel.app,https://*.vercel.app"
 * Entries are normalized and may use a `*` wildcard for preview deploys.
 */
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

const restrictOrigins =
  process.env.NODE_ENV === "production" && allowedOrigins.length > 0;

const corsOptions: cors.CorsOptions = restrictOrigins
  ? {
      origin(origin, callback) {
        // No Origin header: server-to-server, curl, health checks. Not a
        // browser request, so CORS doesn't apply — let it through.
        if (!origin) return callback(null, true);

        if (isOriginAllowed(origin, allowedOrigins)) {
          return callback(null, true);
        }

        // Loud on purpose: `cors` otherwise just omits the header and the
        // browser reports a generic CORS failure with nothing in the logs.
        logger.warn(
          { rejectedOrigin: origin, allowedOrigins },
          "[cors] Blocked request from origin not in ALLOWED_ORIGINS",
        );
        return callback(null, false);
      },
    }
  : {};

const apiRateLimit = rateLimit({
  // Server-side rendering on Vercel egresses from a small pool of shared IPs,
  // so a whole region's traffic can land on one bucket. 100/min was too tight.
  windowMs: 60_000,
  limit: 300,
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
