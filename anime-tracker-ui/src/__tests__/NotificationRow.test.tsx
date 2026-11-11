import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationRow } from "@/components/common/NotificationRow";
import { normalizeNotification } from "@/lib/episodes";

const NOW = Date.parse("2026-11-11T18:00:00Z");

const row = (extra: object = {}) =>
  normalizeNotification({
    animeId: 1,
    episode: 6,
    airedAt: "2026-11-11T14:00:00Z",
    title: "Dandadan",
    poster: null,
    ...extra,
  });

const renderRow = (n: ReturnType<typeof row>, upcoming = false) =>
  render(
    <ul>
      <NotificationRow
        n={n}
        upcoming={upcoming}
        unread={false}
        now={NOW}
        onNavigate={() => {}}
      />
    </ul>,
  );

describe("NotificationRow", () => {
  it("shows how long ago a released episode came out", () => {
    renderRow(row());

    expect(screen.getByText(/hace 4 h/)).toBeTruthy();
    expect(screen.queryByText(/Retrasado/)).toBeNull();
  });

  it("shows a delayed episode as delayed instead of as released", () => {
    renderRow(row({ delayed: true, delayedUntil: "2026-11-18T14:00:00.000Z" }));

    expect(screen.getByText("Retrasado hasta el 18 nov")).toBeTruthy();
    expect(screen.queryByText(/hace/)).toBeNull();
  });

  it("shows a delayed episode due today as delayed, not with its old time", () => {
    renderRow(
      row({ delayed: true, upcoming: true, airedAt: "2026-11-11T22:00:00Z" }),
      true,
    );

    expect(screen.getByText("Retrasado")).toBeTruthy();
    expect(screen.queryByText(/Sale a las/)).toBeNull();
  });
});
