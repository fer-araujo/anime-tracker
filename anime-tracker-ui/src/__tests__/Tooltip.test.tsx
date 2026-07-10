import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

    // Unhover
    fireEvent.mouseLeave(screen.getByText("Trigger"));

    // Tooltip should disappear
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
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
    expect(tooltip.className).toContain("border-neutral-700");
    expect(tooltip.className).toContain("bg-neutral-800");
    expect(tooltip.className).toContain("text-foreground");
    expect(tooltip.className).toContain("shadow-md");
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
});
