import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/custom/Card";

describe("Card", () => {
  it("renders Card.Root", () => {
    render(<Card.Root>Root</Card.Root>);
    expect(screen.getByText("Root")).toBeInTheDocument();
  });

  it("renders Card.Header children", () => {
    render(
      <Card.Root>
        <Card.Header>Header</Card.Header>
      </Card.Root>,
    );
    expect(screen.getByText("Header")).toBeInTheDocument();
  });

  it("renders Card.Content children", () => {
    render(
      <Card.Root>
        <Card.Content>Content</Card.Content>
      </Card.Root>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders Card.Footer children", () => {
    render(
      <Card.Root>
        <Card.Footer>Footer</Card.Footer>
      </Card.Root>,
    );
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("has compound access via Card.Root", () => {
    expect(Card.Root).toBeDefined();
    expect(Card.Header).toBeDefined();
    expect(Card.Content).toBeDefined();
    expect(Card.Footer).toBeDefined();
  });
});
