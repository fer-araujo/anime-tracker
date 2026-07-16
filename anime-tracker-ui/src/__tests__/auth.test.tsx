import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("AuthForm — signin step (default)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the signin form by default", () => {
    render(<AuthForm />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByText("Tu anime, elevado.")).toBeTruthy();
    expect(screen.getByLabelText("Correo electrónico")).toBeTruthy();
    expect(screen.getByLabelText("Contraseña")).toBeTruthy();
    expect(screen.getByText("Iniciar sesión")).toBeTruthy();
  });

  it("renders Google OAuth button", () => {
    render(<AuthForm />);
    expect(screen.getByText("Continuar con Google")).toBeTruthy();
  });

  it("does NOT render GitHub button", () => {
    render(<AuthForm />);
    expect(screen.queryByText("GitHub")).toBeNull();
  });

  it("shows register toggle on signin step", () => {
    render(<AuthForm />);
    expect(screen.getByText("¿No tienes una cuenta?")).toBeTruthy();
    expect(screen.getByText("Regístrate")).toBeTruthy();
  });
});

describe("AuthForm — signup toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("switches to signup form when clicking Regístrate", () => {
    render(<AuthForm />);
    fireEvent.click(screen.getByText("Regístrate"));

    expect(screen.getByLabelText("Nombre de usuario")).toBeTruthy();
    expect(screen.getByText("Crear cuenta")).toBeTruthy();
    expect(screen.getByText("¿Ya tienes una cuenta?")).toBeTruthy();
    expect(screen.getByText("Inicia sesión")).toBeTruthy();
  });
});
