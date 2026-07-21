import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthForm from "@/components/auth/AuthForm";
import {
  validateSignIn,
  validateSignUp,
  validateRedirectTo,
  EMAIL_REGEX,
  USERNAME_REGEX,
} from "@/lib/validations/auth";

// Mock navigator.language to Spanish for consistent test assertions
Object.defineProperty(window, "navigator", {
  value: { language: "es" },
  writable: true,
});

// Hoisted mock so it survives vi.mock hoisting
const { mockSearchParams } = vi.hoisted(() => ({
  mockSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams(),
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
    mockSearchParams.mockReturnValue(new URLSearchParams());
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
    expect(
      screen.getByText((content) => content.includes("Baka... ¿aún sin cuenta?")),
    ).toBeTruthy();
    expect(screen.getByText("Regístrate")).toBeTruthy();
  });
});

describe("AuthForm — signup toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("switches to signup form when clicking Regístrate", () => {
    render(<AuthForm />);
    fireEvent.click(screen.getByText("Regístrate"));

    expect(screen.getByLabelText("Nombre de usuario")).toBeTruthy();
    expect(screen.getByText("Crear cuenta")).toBeTruthy();
    expect(
      screen.getByText((content) => content.includes("¿Ya viste suficiente?")),
    ).toBeTruthy();
    expect(screen.getByText("Inicia sesión")).toBeTruthy();
  });
});

/* ========================================================================== */
/*  Validation unit tests                                                      */
/* ========================================================================== */

describe("EMAIL_REGEX", () => {
  it("rejects invalid email formats", () => {
    expect(EMAIL_REGEX.test("notanemail")).toBe(false);
    expect(EMAIL_REGEX.test("user@")).toBe(false);
    expect(EMAIL_REGEX.test("@domain.com")).toBe(false);
    expect(EMAIL_REGEX.test("user@domain")).toBe(false);
    expect(EMAIL_REGEX.test("user@domain.")).toBe(false);
    expect(EMAIL_REGEX.test("user @domain.com")).toBe(false);
  });

  it("accepts valid email formats", () => {
    expect(EMAIL_REGEX.test("test@example.com")).toBe(true);
    expect(EMAIL_REGEX.test("user.name@domain.co")).toBe(true);
    expect(EMAIL_REGEX.test("user+tag@domain.org")).toBe(true);
  });
});

describe("USERNAME_REGEX", () => {
  it("rejects special characters like @", () => {
    expect(USERNAME_REGEX.test("user@name")).toBe(false);
    expect(USERNAME_REGEX.test("user!name")).toBe(false);
    expect(USERNAME_REGEX.test("user name")).toBe(false);
    expect(USERNAME_REGEX.test("user-name")).toBe(false);
  });

  it("accepts valid usernames", () => {
    expect(USERNAME_REGEX.test("valid_user")).toBe(true);
    expect(USERNAME_REGEX.test("Username123")).toBe(true);
  });
});

describe("validateSignUp", () => {
  it("rejects username with special characters (@)", () => {
    const result = validateSignUp("test@example.com", "user@name", "password123");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain("guion bajo");
    }
  });

  it("rejects username that is too short (< 3 chars)", () => {
    const result = validateSignUp("test@example.com", "ab", "password123");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain("3 caracteres");
    }
  });

  it("rejects password that is too short (< 6 chars) on signup", () => {
    const result = validateSignUp("test@example.com", "valid_user", "12345");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain("6 caracteres");
    }
  });

  it("accepts valid signup data", () => {
    const result = validateSignUp("test@example.com", "valid_user", "password123");
    expect(result.valid).toBe(true);
  });
});

describe("validateRedirectTo", () => {
  it("falls back to '/' when redirect is null", () => {
    expect(validateRedirectTo(null)).toBe("/");
  });

  it("falls back to '/' for absolute URLs (open redirect)", () => {
    expect(validateRedirectTo("https://evil.com")).toBe("/");
    expect(validateRedirectTo("http://phishing.com")).toBe("/");
  });

  it("falls back to '/' for protocol-relative URLs", () => {
    expect(validateRedirectTo("//evil.com")).toBe("/");
    expect(validateRedirectTo("//attacker.net/path")).toBe("/");
  });

  it("falls back to '/' when redirect contains @ sign", () => {
    expect(validateRedirectTo("@evil.com")).toBe("/");
  });

  it("passes through safe relative paths", () => {
    expect(validateRedirectTo("/dashboard")).toBe("/dashboard");
    expect(validateRedirectTo("/settings/profile")).toBe("/settings/profile");
    expect(validateRedirectTo("/")).toBe("/");
  });
});

describe("AuthForm — OAuth error param", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error banner when OAuth error param is present", () => {
    mockSearchParams.mockReturnValue(new URLSearchParams("error=access_denied"));
    render(<AuthForm />);
    expect(
      screen.getByText("No se pudo completar el inicio de sesión. Intenta de nuevo."),
    ).toBeTruthy();
  });

  it("does NOT show OAuth error banner when no error param", () => {
    mockSearchParams.mockReturnValue(new URLSearchParams());
    render(<AuthForm />);
    expect(
      screen.queryByText("No se pudo completar el inicio de sesión. Intenta de nuevo."),
    ).toBeNull();
  });
});
