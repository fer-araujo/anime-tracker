import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "@/components/custom/Badge";

describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-primary");
  });

  it("renders with secondary variant", () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const badge = screen.getByText("Secondary");
    expect(badge.className).toContain("bg-secondary");
  });

  it("renders with destructive variant", () => {
    render(<Badge variant="destructive">Destructive</Badge>);
    const badge = screen.getByText("Destructive");
    expect(badge.className).toContain("bg-destructive");
  });

  it("renders with outline variant", () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText("Outline");
    expect(badge.className).toContain("border");
  });

  it("renders children", () => {
    render(<Badge>Hello</Badge>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("merges className", () => {
    render(<Badge className="extra-class">Merged</Badge>);
    const badge = screen.getByText("Merged");
    expect(badge.className).toContain("extra-class");
  });
});
