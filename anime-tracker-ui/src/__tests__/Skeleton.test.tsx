import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Skeleton from "@/components/custom/Skeleton";

describe("Skeleton", () => {
  it("renders with default classes", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("animate-pulse");
    expect(div.className).toContain("bg-muted");
    expect(div.className).toContain("rounded-md");
  });

  it("merges className", () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("h-10");
    expect(div.className).toContain("w-full");
    expect(div.className).toContain("animate-pulse");
  });
});