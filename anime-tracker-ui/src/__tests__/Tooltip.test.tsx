import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Tooltip from "@/components/custom/Tooltip";

describe("Tooltip", () => {
  it("renders trigger element", () => {
    render(
      <Tooltip content="Tooltip content">
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByText("Trigger")).toBeInTheDocument();
  });

  it("shows tooltip on hover and hides on leave", () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="Tooltip content">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    // Tooltip should NOT be visible before hover
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Hover over trigger
    fireEvent.mouseEnter(screen.getByText("Trigger"));

    // Tooltip should appear with content
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Tooltip content");

    // Unhover — hide has a 150ms delay
    fireEvent.mouseLeave(screen.getByText("Trigger"));

    // Tooltip should still be visible during the delay
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    // Advance time past the hide delay
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Tooltip should disappear after the timeout fires
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("tooltip has correct visual classes when visible", () => {
    render(
      <Tooltip content="Visual check">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText("Trigger"));
    const tooltip = screen.getByRole("tooltip");

    expect(tooltip.className).toContain("rounded-md");
    expect(tooltip.className).toContain("border-neutral-600");
    expect(tooltip.className).toContain("bg-neutral-900/95");
    expect(tooltip.className).toContain("backdrop-blur-sm");
    expect(tooltip.className).toContain("px-4");
    expect(tooltip.className).toContain("py-3");
    expect(tooltip.className).toContain("text-foreground");
    expect(tooltip.className).toContain("shadow-lg");
  });

  it("has aria-describedby on trigger span when tooltip is visible", () => {
    render(
      <Tooltip content="A11y check">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText("Trigger"));
    const tooltip = screen.getByRole("tooltip");

    // The trigger span wrapper should have aria-describedby pointing to the tooltip id
    // (aria-describedby is on the span, not on the button child)
    const triggerSpan = screen.getByText("Trigger").parentElement;
    expect(triggerSpan).toHaveAttribute("aria-describedby");

    const describedBy = triggerSpan!.getAttribute("aria-describedby");
    expect(tooltip.id).toBe(describedBy);
  });

  it("renders portal at document.body level", () => {
    render(
      <Tooltip content="Portal check">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText("Trigger"));
    const tooltip = screen.getByRole("tooltip");

    // Tooltip should be a direct child of document.body
    expect(tooltip.parentElement).toBe(document.body);
  });

  it("has correct fixed positioning style when visible", () => {
    render(
      <Tooltip content="Position check">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText("Trigger"));
    const tooltip = screen.getByRole("tooltip");

    expect(tooltip.style.position).toBe("fixed");
    expect(tooltip.style.zIndex).toBe("50");
  });

  it("mouse moves from trigger to tooltip without hiding", () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="Persist">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    // Hover trigger → tooltip appears
    fireEvent.mouseEnter(screen.getByText("Trigger"));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();

    // Leave trigger → 150ms hide timer starts
    fireEvent.mouseLeave(screen.getByText("Trigger"));

    // Enter tooltip before timer fires → cancels hide
    fireEvent.mouseEnter(tooltip);

    // Advance well past the hide delay — tooltip stays visible
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    // Leave tooltip → 150ms hide timer starts
    fireEvent.mouseLeave(tooltip);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("rapid hover/unhover leaves no ghost tooltip", () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="Ghost">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    // Rapidly hover and unhover
    fireEvent.mouseEnter(screen.getByText("Trigger"));
    fireEvent.mouseLeave(screen.getByText("Trigger"));

    // Advance past the hide timeout
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // No ghost tooltip should remain
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("unmounts during hide delay without state update warning", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();

    const { unmount } = render(
      <Tooltip content="Unmount">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText("Trigger"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    // Start hide (150ms delay)
    fireEvent.mouseLeave(screen.getByText("Trigger"));

    // Unmount while hide is pending
    unmount();

    // Advance time — no "state update on unmounted component" warning
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    vi.useRealTimers();
  });

  describe("language badge", () => {
    it("renders badge when synopsisLang is 'en'", () => {
      render(
        <Tooltip content="English text" synopsisLang="en">
          <button type="button">Trigger</button>
        </Tooltip>,
      );
      fireEvent.mouseEnter(screen.getByText("Trigger"));
      expect(screen.getByText(/Solo disponible en inglés/)).toBeInTheDocument();
    });

    it("does not render badge when synopsisLang is 'es'", () => {
      render(
        <Tooltip content="Texto español" synopsisLang="es">
          <button type="button">Trigger</button>
        </Tooltip>,
      );
      fireEvent.mouseEnter(screen.getByText("Trigger"));
      expect(
        screen.queryByText(/Solo disponible en inglés/),
      ).not.toBeInTheDocument();
    });

    it("does not render badge when synopsisLang is undefined", () => {
      render(
        <Tooltip content="No badge">
          <button type="button">Trigger</button>
        </Tooltip>,
      );
      fireEvent.mouseEnter(screen.getByText("Trigger"));
      expect(
        screen.queryByText(/Solo disponible en inglés/),
      ).not.toBeInTheDocument();
    });

    it("does not render badge when synopsisLang is null", () => {
      render(
        <Tooltip content="Null badge" synopsisLang={null}>
          <button type="button">Trigger</button>
        </Tooltip>,
      );
      fireEvent.mouseEnter(screen.getByText("Trigger"));
      expect(
        screen.queryByText(/Solo disponible en inglés/),
      ).not.toBeInTheDocument();
    });
  });
});

describe("Tooltip boundary", () => {
  it("stays inside the nearest marked boundary, clear of what lies beyond it", () => {
    // A carousel track from x=100 to x=300, with its arrow just past x=300.
    // The trigger sits at the track's right end.
    const rects: Record<string, Partial<DOMRect>> = {
      boundary: { left: 100, right: 300, top: 0, bottom: 400, width: 200, height: 400 },
      trigger: { left: 260, right: 300, top: 100, bottom: 140, width: 40, height: 40 },
    };
    const spy = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: Element) {
        const key = this.hasAttribute("data-tooltip-boundary")
          ? "boundary"
          : this.textContent === "Trigger"
            ? "trigger"
            : null;
        return { x: 0, y: 0, toJSON: () => ({}), ...(key ? rects[key] : {}) } as DOMRect;
      });

    // jsdom lays nothing out; give the tooltip the width a long synopsis has.
    const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return this.getAttribute("role") === "tooltip" ? 400 : 0;
      },
    });

    render(
      <div data-tooltip-boundary>
        <Tooltip content="A long synopsis">
          <span>Trigger</span>
        </Tooltip>
      </div>,
    );
    fireEvent.mouseEnter(screen.getByText("Trigger"));

    const tip = screen.getByRole("tooltip");
    const left = parseFloat(tip.style.left);
    const maxWidth = parseFloat(tip.style.maxWidth);
    expect(left).toBeGreaterThanOrEqual(108);
    expect(left + maxWidth).toBeLessThanOrEqual(292);
    spy.mockRestore();
    if (width) Object.defineProperty(HTMLElement.prototype, "offsetWidth", width);
  });
});
