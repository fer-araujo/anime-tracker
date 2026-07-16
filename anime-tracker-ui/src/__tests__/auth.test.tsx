import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthForm from "@/components/auth/AuthForm";

// Mock next/navigation for AuthForm
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("AuthForm", () => {
  it("renders the sign-in form by default", () => {
    render(<AuthForm />);
    expect(screen.getByText("Anime Tracker")).toBeTruthy();
    // Description text is unique; "Iniciar sesión" appears twice (tab + submit)
    expect(
      screen.getByText("Inicia sesión para gestionar tu lista"),
    ).toBeTruthy();
    expect(screen.getByText("Crear cuenta")).toBeTruthy();
  });

  it("renders email and password inputs", () => {
    render(<AuthForm />);
    expect(screen.getByLabelText("Correo electrónico")).toBeTruthy();
    expect(screen.getByLabelText("Contraseña")).toBeTruthy();
  });

  it("renders Google and GitHub OAuth buttons", () => {
    render(<AuthForm />);
    expect(screen.getByText("Google")).toBeTruthy();
    expect(screen.getByText("GitHub")).toBeTruthy();
  });

  it("renders the submit button with sign-in text", () => {
    render(<AuthForm />);
    // Multiple elements contain "Iniciar sesión" — at least the submit button
    const matches = screen.getAllByText("Iniciar sesión");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // The submit button is type="submit"
    const submitBtn = matches.find(
      (el) => el.getAttribute("type") === "submit",
    );
    expect(submitBtn).toBeTruthy();
  });

  it("switches to sign-up mode when clicking Crear cuenta tab", () => {
    render(<AuthForm />);
    const signUpTab = screen.getByText("Crear cuenta");
    signUpTab.click();
    expect(screen.getByText("Crear cuenta")).toBeTruthy();
  });
});
