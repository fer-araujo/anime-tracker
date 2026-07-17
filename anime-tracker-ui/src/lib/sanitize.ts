/**
 * Sanitizes user input by stripping HTML tags and stray angle brackets.
 * Optionally truncates to a maximum length.
 *
 * @param value - The input string to sanitize
 * @param maxLength - Optional maximum length to truncate to
 * @returns The sanitized string
 */
export function sanitizeInput(value: string, maxLength?: number): string {
  let sanitized = value
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/</g, "") // Strip stray <
    .replace(/>/g, ""); // Strip stray >
  if (maxLength !== undefined) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}
