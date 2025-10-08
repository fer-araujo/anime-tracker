import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import router from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";


const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(compression());

// healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

// v1 API
app.use("/v1", router);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

export default app;
