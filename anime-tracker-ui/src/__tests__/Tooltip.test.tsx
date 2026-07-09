import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("has tooltip content in the DOM", () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByText("Tooltip content")).toBeInTheDocument();
  });

  it("tooltip content is hidden by default (has opacity-0)", () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Trigger</button>
      </Tooltip>,
    );
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("opacity-0");
  });
});