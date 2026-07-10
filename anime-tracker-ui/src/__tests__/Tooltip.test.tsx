import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Tooltip from "@/components/custom/Tooltip";

describe("Tooltip", () => {
  it("renders trigger element", () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByText("Trigger")).toBeInTheDocument();
  });

  it("shows tooltip on hover and hides on leave", () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="Tooltip content">
        <button>Trigger</button>
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
        <button>Trigger</button>
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
        <button>Trigger</button>
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
        <button>Trigger</button>
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
        <button>Trigger</button>
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
        <button>Trigger</button>
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
        <button>Trigger</button>
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
        <button>Trigger</button>
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
          <button>Trigger</button>
        </Tooltip>,
      );
      fireEvent.mouseEnter(screen.getByText("Trigger"));
      expect(
        screen.getByText(/Solo disponible en inglés/),
      ).toBeInTheDocument();
    });

    it("does not render badge when synopsisLang is 'es'", () => {
      render(
        <Tooltip content="Texto español" synopsisLang="es">
          <button>Trigger</button>
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
          <button>Trigger</button>
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
          <button>Trigger</button>
        </Tooltip>,
      );
      fireEvent.mouseEnter(screen.getByText("Trigger"));
      expect(
        screen.queryByText(/Solo disponible en inglés/),
      ).not.toBeInTheDocument();
    });
  });
});
