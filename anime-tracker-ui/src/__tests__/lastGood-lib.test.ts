import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calendarCacheKey,
  calendarCachePrefix,
  clearLastGood,
  clearLastGoodWhere,
  notificationsCacheKey,
  pruneCalendarCache,
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

describe("calendar cache", () => {
  it("keys a week per user on its start date, with a version", () => {
    expect(calendarCacheKey("u1", "2026-10-18")).toBe(
      "calendar:v1:u1:2026-10-18",
    );
    expect(calendarCacheKey("u1", "2026-10-18")).not.toBe(
      calendarCacheKey("u2", "2026-10-18"),
    );
  });

  it("prunes a user's weeks older than the oldest the page can ask for", () => {
    for (const week of ["2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"]) {
      writeLastGood(calendarCacheKey("u1", week), week);
    }
    writeLastGood(calendarCacheKey("u2", "2026-10-04"), "other user");

    pruneCalendarCache("u1", "2026-10-11");

    expect(readLastGood(calendarCacheKey("u1", "2026-10-04"))).toBeNull();
    expect(readLastGood(calendarCacheKey("u1", "2026-10-11"))).toBe("2026-10-11");
    expect(readLastGood(calendarCacheKey("u1", "2026-10-25"))).toBe("2026-10-25");
    // Only the writer's own weeks: another account prunes on its own visit.
    expect(readLastGood(calendarCacheKey("u2", "2026-10-04"))).toBe("other user");
  });

  it("clears every account's weeks and nothing else", () => {
    writeLastGood(calendarCacheKey("u1", "2026-10-18"), 1);
    writeLastGood(calendarCacheKey("u2", "2026-10-18"), 2);
    writeLastGood(notificationsCacheKey("u1"), 3);

    clearLastGoodWhere(calendarCachePrefix());

    expect(readLastGood(calendarCacheKey("u1", "2026-10-18"))).toBeNull();
    expect(readLastGood(calendarCacheKey("u2", "2026-10-18"))).toBeNull();
    expect(readLastGood(notificationsCacheKey("u1"))).toBe(3);
  });
});
