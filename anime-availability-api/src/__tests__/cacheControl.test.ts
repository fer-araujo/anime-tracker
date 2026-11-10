import { describe, it, expect, vi } from "vitest";
import { setCacheControl } from "../utils/cache.js";

describe("setCacheControl", () => {
  it("makes the browser revalidate instead of painting a stale copy", () => {
    // `stale-while-revalidate` with no `max-age` still applies in a browser:
    // /season showed a copy up to twelve hours old and only updated on the
    // next reload.
    const setHeader = vi.fn();

    setCacheControl({ setHeader });

    expect(setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
  });
});
