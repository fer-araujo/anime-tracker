import http from "http";
import "./config/env.js";
import app from "./app.js";

const PORT = Number(process.env.PORT || 3000);

const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
