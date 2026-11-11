import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  clearLastGood,
  notificationsCacheKey,
  readLastGood,
  writeLastGood,
} from "@/lib/lastGood";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lastGood", () => {
  it("round-trips a value", () => {
    writeLastGood("k", { items: [1, 2], seenAt: "2026-01-01T00:00:00Z" });
    expect(readLastGood("k")).toEqual({
      items: [1, 2],
      seenAt: "2026-01-01T00:00:00Z",
    });
  });

  it("returns null for a key never written", () => {
    expect(readLastGood("missing")).toBeNull();
  });

  it("returns null for a payload that is not JSON", () => {
    // Hand-edited in devtools, or written by an older build: never an error.
    localStorage.setItem("k", "{not json");
    expect(readLastGood("k")).toBeNull();
  });

  it("clears a value", () => {
    writeLastGood("k", 1);
    clearLastGood("k");
    expect(readLastGood("k")).toBeNull();
  });

  it("treats storage that throws as an empty cache", () => {
    // Private mode, blocked site data and a full quota all throw here.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => writeLastGood("k", 1)).not.toThrow();
    expect(readLastGood("k")).toBeNull();
    expect(() => clearLastGood("k")).not.toThrow();
  });

  it("keys notifications per user, with a version", () => {
    expect(notificationsCacheKey("u1")).toBe("notifications:v1:u1");
    expect(notificationsCacheKey("u1")).not.toBe(notificationsCacheKey("u2"));
  });
});
