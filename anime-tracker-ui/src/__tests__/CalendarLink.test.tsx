import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TrackingStatus } from "@/types/anime";

const { lib } = vi.hoisted(() => ({
  lib: { statuses: new Map() as ReadonlyMap<number, TrackingStatus> },
}));

vi.mock("@/providers/UserListsProvider", () => ({
  useUserListsContext: () => ({ statusByAnimeId: lib.statuses }),
}));

const { CalendarLink } = await import("@/components/common/CalendarLink");

beforeEach(() => {
  lib.statuses = new Map();
});

describe("CalendarLink", () => {
  it("stays hidden until the user has a status on something", () => {
    // A favourite with no status is not in this map, so it does not count.
    const { container } = render(<CalendarLink />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each(["watching", "dropped", "plan_to_watch"] as TrackingStatus[])(
    "appears for a %s anime, since any status counts",
    (status) => {
      lib.statuses = new Map([[1, status]]);

      render(<CalendarLink />);

      expect(screen.getByRole("link", { name: "Calendario" })).toHaveAttribute(
        "href",
        "/calendar",
      );
    },
  );
});
