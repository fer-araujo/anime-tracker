import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AiringCalendar, CalendarDay } from "@/types/calendar";
import type { TrackingStatus } from "@/types/anime";

const { lib, router, nav } = vi.hoisted(() => ({
  lib: {
    statuses: new Map() as ReadonlyMap<number, TrackingStatus>,
    loading: false,
    user: { id: "u1" } as { id: string } | null,
  },
  router: { push: vi.fn(), replace: vi.fn() },
  nav: { params: new URLSearchParams() },
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ user: lib.user, loading: false }),
}));
vi.mock("@/providers/UserListsProvider", () => ({
  useUserListsContext: () => ({
    statusByAnimeId: lib.statuses,
    loading: lib.loading,
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => nav.params,
}));

const fetchAiringCalendar = vi.fn();
vi.mock("@/lib/calendar", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchAiringCalendar: (...a: unknown[]) => fetchAiringCalendar(...a),
}));

const { AiringCalendarPage } = await import(
  "@/components/calendar/AiringCalendarPage"
);

const DATES = ["18", "19", "20", "21", "22", "23", "24"].map(
  (d) => `2026-10-${d}`,
);

function calendar(
  today: string | null,
  items: Record<string, CalendarDay["items"]> = {},
): AiringCalendar {
  return {
    meta: { firstDate: DATES[0], lastDate: DATES[6], today, week: 0 },
    data: DATES.map((date) => ({
      date,
      status: "ok",
      items: items[date] ?? [],
    })),
  };
}

const entry = (animeId: number, title: string) => ({
  animeId,
  title,
  poster: null,
  airingAt: "2026-10-22T20:00:00Z",
  range: { from: 5, to: 5, total: 12 },
});

const grid = () => screen.findByTestId("week-grid");

beforeEach(() => {
  vi.clearAllMocks();
  lib.user = { id: "u1" };
  lib.loading = false;
  lib.statuses = new Map([[1, "watching"]]);
  nav.params = new URLSearchParams();
});

describe("AiringCalendarPage", () => {
  it("sends every id that has a status, whatever the status", async () => {
    lib.statuses = new Map<number, TrackingStatus>([
      [1, "watching"],
      [2, "dropped"],
    ]);
    fetchAiringCalendar.mockResolvedValue(calendar(DATES[4]));

    render(<AiringCalendarPage />);
    await grid();

    expect(fetchAiringCalendar).toHaveBeenCalledWith([1, 2], 0);
  });

  it("tints each entry with its own status", async () => {
    lib.statuses = new Map<number, TrackingStatus>([
      [1, "watching"],
      [2, "dropped"],
    ]);
    fetchAiringCalendar.mockResolvedValue(
      calendar(DATES[4], { [DATES[4]]: [entry(1, "Uno"), entry(2, "Dos")] }),
    );

    render(<AiringCalendarPage />);
    const view = within(await grid());

    const tintOf = (title: string) =>
      view.getByText(title).closest("a")!.querySelector("[data-status-tint]")!;
    expect(tintOf("Uno")).toHaveAttribute("data-status-tint", "watching");
    expect(tintOf("Dos")).toHaveAttribute("data-status-tint", "dropped");
  });

  it("names the status in text, since colour alone says nothing to everyone", async () => {
    fetchAiringCalendar.mockResolvedValue(
      calendar(DATES[4], { [DATES[4]]: [entry(1, "Uno")] }),
    );

    render(<AiringCalendarPage />);
    const view = within(await grid());

    expect(view.getByText("Viendo")).toBeInTheDocument();
  });

  it("marks today and dims only the other days", async () => {
    fetchAiringCalendar.mockResolvedValue(calendar(DATES[4]));

    render(<AiringCalendarPage />);
    const sections = (await grid()).querySelectorAll("section");

    expect(sections[4]).toHaveAttribute("aria-current", "date");
    expect(sections[4]).not.toHaveAttribute("data-dimmed");
    expect(sections[3]).toHaveAttribute("data-dimmed");
    // The attribute only labels it; this is what actually turns the day down.
    const body = (s: Element) => s.querySelector("[data-testid=day-body]")!;
    expect(body(sections[3]).className).toContain("opacity-55");
    expect(body(sections[4]).className).not.toContain("opacity-55");
  });

  it("dims nothing in a week that does not contain today", async () => {
    fetchAiringCalendar.mockResolvedValue(calendar(null));

    render(<AiringCalendarPage />);
    const sections = (await grid()).querySelectorAll("section");

    expect(sections[0]).not.toHaveAttribute("data-dimmed");
  });

  it("lists the selected day on a phone, starting from today", async () => {
    fetchAiringCalendar.mockResolvedValue(
      calendar(DATES[4], {
        [DATES[4]]: [entry(1, "De hoy")],
        [DATES[5]]: [entry(1, "De mañana")],
      }),
    );
    const user = userEvent.setup();

    render(<AiringCalendarPage />);
    const picker = within(await screen.findByTestId("day-picker"));

    expect(picker.getByText("De hoy")).toBeInTheDocument();
    await user.click(picker.getByRole("button", { name: /23/ }));
    expect(picker.getByText("De mañana")).toBeInTheDocument();
    expect(picker.queryByText("De hoy")).not.toBeInTheDocument();
  });

  it("tells a day that failed apart from one with nothing on it", async () => {
    const data = calendar(DATES[4]);
    data.data[0].status = "unavailable";
    fetchAiringCalendar.mockResolvedValue(data);

    render(<AiringCalendarPage />);
    const view = within(await grid());

    expect(view.getByText("Sin datos para este día")).toBeInTheDocument();
    expect(view.getAllByText("Sin episodios")).toHaveLength(6);
  });

  it("offers a way forward with no status, and asks nothing of the API", async () => {
    lib.statuses = new Map();

    render(<AiringCalendarPage />);

    expect(
      await screen.findByRole("link", { name: "Explorar la temporada" }),
    ).toBeInTheDocument();
    expect(fetchAiringCalendar).not.toHaveBeenCalled();
  });

  it("waits for the library instead of requesting with an empty one", () => {
    lib.loading = true;
    lib.statuses = new Map();

    render(<AiringCalendarPage />);

    expect(screen.getByTestId("calendar-loading")).toBeInTheDocument();
    expect(fetchAiringCalendar).not.toHaveBeenCalled();
  });

  it("shows an error it can retry from", async () => {
    fetchAiringCalendar
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValue(calendar(DATES[4]));
    const user = userEvent.setup();

    render(<AiringCalendarPage />);
    await user.click(await screen.findByRole("button", { name: "Reintentar" }));

    expect(await grid()).toBeInTheDocument();
    expect(fetchAiringCalendar).toHaveBeenCalledTimes(2);
  });

  it("finishes loading under StrictMode", async () => {
    // Development runs effects twice; the answer must still land.
    fetchAiringCalendar.mockResolvedValue(calendar(DATES[4]));

    render(
      <StrictMode>
        <AiringCalendarPage />
      </StrictMode>,
    );

    expect(await grid()).toBeInTheDocument();
    expect(fetchAiringCalendar).toHaveBeenCalledTimes(1);
  });

  it("sends a signed-out visitor to log in", async () => {
    lib.user = null;

    render(<AiringCalendarPage />);

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/login?redirect=/calendar"),
    );
  });

  it("changes week through the URL", async () => {
    fetchAiringCalendar.mockResolvedValue(calendar(DATES[4]));
    const user = userEvent.setup();

    render(<AiringCalendarPage />);
    await grid();
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));

    expect(router.replace).toHaveBeenCalledWith("/calendar?week=1", {
      scroll: false,
    });
  });
});

describe("AiringCalendarPage across changes", () => {
  it("asks for the week in the URL", async () => {
    nav.params = new URLSearchParams("week=-1");
    fetchAiringCalendar.mockResolvedValue(calendar(null));

    render(<AiringCalendarPage />);
    await grid();

    expect(fetchAiringCalendar).toHaveBeenCalledWith([1], -1);
  });

  it("drops a late answer for a week no longer on screen", async () => {
    let answerOldWeek!: (c: AiringCalendar) => void;
    fetchAiringCalendar
      .mockImplementationOnce(
        () => new Promise((resolve) => (answerOldWeek = resolve)),
      )
      .mockResolvedValueOnce(
        calendar(null, { [DATES[0]]: [entry(1, "Semana nueva")] }),
      );

    const { rerender } = render(<AiringCalendarPage />);
    nav.params = new URLSearchParams("week=1");
    rerender(<AiringCalendarPage />);
    const view = within(await grid());
    expect(view.getByText("Semana nueva")).toBeInTheDocument();

    await act(async () =>
      answerOldWeek(calendar(DATES[4], { [DATES[4]]: [entry(1, "Semana vieja")] })),
    );

    expect(screen.queryByText("Semana vieja")).not.toBeInTheDocument();
    expect(view.getByText("Semana nueva")).toBeInTheDocument();
  });

  it("keeps the week on screen while the library refreshes", async () => {
    // Every Supabase token refresh refetches the library with the same ids.
    fetchAiringCalendar.mockResolvedValue(calendar(DATES[4]));

    const { rerender } = render(<AiringCalendarPage />);
    await grid();
    lib.loading = true;
    rerender(<AiringCalendarPage />);
    expect(screen.getByTestId("week-grid")).toBeInTheDocument();
    lib.loading = false;
    rerender(<AiringCalendarPage />);

    expect(screen.getByTestId("week-grid")).toBeInTheDocument();
    expect(fetchAiringCalendar).toHaveBeenCalledTimes(1);
  });

  it("does not call a week empty when some days failed to load", async () => {
    const data = calendar(DATES[4]);
    data.data[0].status = "unavailable";
    fetchAiringCalendar.mockResolvedValue(data);

    render(<AiringCalendarPage />);
    await grid();

    expect(
      screen.queryByText("Nada de lo que sigues se emite esta semana."),
    ).not.toBeInTheDocument();
  });
});

describe("AiringCalendarPage filters and time", () => {
  const twoStatuses = () => {
    lib.statuses = new Map<number, TrackingStatus>([
      [1, "watching"],
      [2, "dropped"],
    ]);
    fetchAiringCalendar.mockResolvedValue(
      calendar(DATES[4], { [DATES[4]]: [entry(1, "Uno"), entry(2, "Dos")] }),
    );
  };

  it("filters by status through the URL", async () => {
    twoStatuses();
    const user = userEvent.setup();

    const { rerender } = render(<AiringCalendarPage />);
    await grid();
    await user.click(screen.getByRole("button", { name: /Abandonado/ }));
    expect(router.replace).toHaveBeenCalledWith("/calendar?status=dropped", {
      scroll: false,
    });

    nav.params = new URLSearchParams("status=dropped");
    rerender(<AiringCalendarPage />);
    const view = within(screen.getByTestId("week-grid"));

    expect(view.queryByText("Uno")).not.toBeInTheDocument();
    expect(view.getByText("Dos")).toBeInTheDocument();
  });

  it("keeps the filter when changing week", async () => {
    twoStatuses();
    nav.params = new URLSearchParams("status=watching");
    const user = userEvent.setup();

    render(<AiringCalendarPage />);
    await grid();
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));

    expect(router.replace).toHaveBeenCalledWith(
      "/calendar?week=1&status=watching",
      { scroll: false },
    );
  });

  it("keeps a filter the week on screen cannot show", async () => {
    // Shown as everything here, but the next week may well have it.
    nav.params = new URLSearchParams("status=dropped");
    fetchAiringCalendar.mockResolvedValue(
      calendar(DATES[4], { [DATES[4]]: [entry(1, "Uno")] }),
    );
    const user = userEvent.setup();

    render(<AiringCalendarPage />);
    await grid();
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));

    expect(router.replace).toHaveBeenCalledWith(
      "/calendar?week=1&status=dropped",
      { scroll: false },
    );
  });

  it("keeps the filter when the week changes while loading", async () => {
    nav.params = new URLSearchParams("status=watching");
    fetchAiringCalendar.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    render(<AiringCalendarPage />);
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));

    expect(router.replace).toHaveBeenCalledWith(
      "/calendar?week=1&status=watching",
      { scroll: false },
    );
  });

  it("ignores a filter for a status with nothing this week", async () => {
    nav.params = new URLSearchParams("status=dropped");
    fetchAiringCalendar.mockResolvedValue(
      calendar(DATES[4], { [DATES[4]]: [entry(1, "Uno")] }),
    );

    render(<AiringCalendarPage />);
    const view = within(await grid());

    expect(view.getByText("Uno")).toBeInTheDocument();
  });
});
