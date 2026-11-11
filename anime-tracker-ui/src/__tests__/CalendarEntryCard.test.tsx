import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarEntryCard } from "@/components/calendar/CalendarEntryCard";
import type { CalendarEntry } from "@/types/calendar";

const entry = (extra: Partial<CalendarEntry> = {}): CalendarEntry => ({
  animeId: 1,
  title: "Dandadan",
  poster: null,
  airingAt: "2026-11-11T14:00:00Z",
  range: { from: 6, to: 6, total: 12 },
  ...extra,
});

describe("CalendarEntryCard delay chip", () => {
  it("shows no chip for an entry that is not delayed, or that predates the field", () => {
    render(<CalendarEntryCard entry={entry({ delayed: false })} status="watching" />);
    render(<CalendarEntryCard entry={entry()} status="watching" />);

    expect(screen.queryByText(/Retrasado/)).toBeNull();
  });

  it("shows the chip beside the time when delayed, with no date when none is known", () => {
    render(
      <CalendarEntryCard
        entry={entry({ delayed: true, delayedUntil: null })}
        status="watching"
      />,
    );

    expect(screen.getByTitle("Retrasado")).toBeTruthy();
    // The time chip stays, the delay is added next to it.
    expect(screen.getByText("08:00")).toBeTruthy();
  });

  it("names the new date for screen readers and on hover when known", () => {
    render(
      <CalendarEntryCard
        entry={entry({ delayed: true, delayedUntil: "2026-11-18T14:00:00.000Z" })}
        status="watching"
      />,
    );

    expect(screen.getByTitle("Retrasado hasta el 18 nov")).toBeTruthy();
    expect(screen.getByText("Retrasado hasta el 18 nov")).toBeTruthy();
  });
});
