import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthForm from "@/components/auth/AuthForm";

// Mock navigator.language to Spanish for consistent test assertions
Object.defineProperty(window, "navigator", {
  value: { language: "es" },
  writable: true,
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock server action
vi.mock("@/actions/auth", () => ({
  checkEmailExists: vi.fn(),
}));

// Mock framer-motion to render children directly (no animations in tests)
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    form: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <form {...rest}>{children}</form>;
    },
    button: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, whileHover, whileTap, whileFocus, whileDrag, whileInView, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
  },
}));

describe("AuthForm — email step (default)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the email input by default", () => {
    render(<AuthForm />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByText(/Your anime/)).toBeTruthy();
    expect(screen.getByText(/elevated/)).toBeTruthy();
    expect(screen.getByText("Comienza tu viaje")).toBeTruthy();
    expect(screen.getByLabelText("Correo electrónico")).toBeTruthy();
  });

  it("renders Continue button instead of Iniciar sesión", () => {
    render(<AuthForm />);
    expect(screen.getByText("Continuar")).toBeTruthy();
  });

  it("renders Google OAuth button on email step", () => {
    render(<AuthForm />);
    expect(screen.getByText("Continuar con Google")).toBeTruthy();
  });

  it("does NOT render GitHub button", () => {
    render(<AuthForm />);
    expect(screen.queryByText("GitHub")).toBeNull();
  });

  it("shows email input as the only auth field initially", () => {
    render(<AuthForm />);
    // On the email step there should be no password field visible
    expect(screen.queryByLabelText("Contraseña")).toBeNull();
  });
});
