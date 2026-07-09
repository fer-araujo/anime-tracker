import http from "http";
import "./config/env.js";
import app from "./app.js";
import { warmupCache } from "./utils/warmup.js";
import { logger } from "./utils/logger.js";

const PORT = Number(process.env.PORT || 3000);

const server = http.createServer(app);
server.listen(PORT, () => {
  logger.info(`API listening on http://localhost:${PORT}`);
  warmupCache();
});
