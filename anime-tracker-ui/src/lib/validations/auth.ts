/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ValidationResult =
  | { valid: true }
  | { valid: false; message: string };

/* -------------------------------------------------------------------------- */
/*  Regexes                                                                    */
/* -------------------------------------------------------------------------- */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

/* -------------------------------------------------------------------------- */
/*  Validation functions                                                       */
/* -------------------------------------------------------------------------- */

export function validateSignIn(
  email: string,
  password: string,
): ValidationResult {
  if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
    return { valid: false, message: "El correo electrónico no es válido" };
  }
  if (!password) {
    return { valid: false, message: "La contraseña es obligatoria" };
  }
  return { valid: true };
}

export function validateSignUp(
  email: string,
  username: string,
  password: string,
): ValidationResult {
  if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
    return { valid: false, message: "El correo electrónico no es válido" };
  }
  if (!username.trim()) {
    return { valid: false, message: "El nombre de usuario es obligatorio" };
  }
  if (!USERNAME_REGEX.test(username.trim())) {
    return {
      valid: false,
      message:
        "El nombre de usuario solo puede contener letras, números y guion bajo",
    };
  }
  if (username.trim().length < 3) {
    return {
      valid: false,
      message: "El nombre de usuario debe tener al menos 3 caracteres",
    };
  }
  if (username.trim().length > 30) {
    return {
      valid: false,
      message: "El nombre de usuario debe tener máximo 30 caracteres",
    };
  }
  if (password.length < 6) {
    return {
      valid: false,
      message: "La contraseña debe tener al menos 6 caracteres",
    };
  }
  return { valid: true };
}

export function validateRedirectTo(redirect: string | null): string {
  if (!redirect) return "/";
  const startsWithSlash = redirect.startsWith("/");
  const hasProtocol = redirect.includes("://");
  const hasAtSign = redirect.includes("@");
  const startsWithDoubleSlash = redirect.startsWith("//");
  if (!startsWithSlash || hasProtocol || hasAtSign || startsWithDoubleSlash)
    return "/";
  return redirect;
}
