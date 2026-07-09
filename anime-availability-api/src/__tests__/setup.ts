import { beforeAll } from "vitest";
import "../config/env.js";

beforeAll(() => {
  // Ensure we're using test-friendly settings
  process.env.DISABLE_CIRCUIT_BREAKER = "true";
});
