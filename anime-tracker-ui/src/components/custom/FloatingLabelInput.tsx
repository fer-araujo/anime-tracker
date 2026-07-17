"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { sanitizeInput } from "@/lib/sanitize";
import Icon from "@/components/custom/Icon";
import type { IconName } from "@/components/custom/Icon";

/* -------------------------------------------------------------------------- */
/*  Props                                                                      */
/* -------------------------------------------------------------------------- */

export interface FloatingLabelInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  minLength?: number;
  maxLength?: number;
  icon?: IconName;
  error?: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function FloatingLabelInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  disabled,
  autoFocus,
  minLength,
  maxLength,
  icon,
  error,
}: FloatingLabelInputProps) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;

  return (
    <div className="relative">
      {icon && (
        <Icon
          name={icon}
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none z-10 transition-all duration-200"
        />
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(sanitizeInput(e.target.value, maxLength))}
        placeholder=" "
        autoComplete={autoComplete}
        required
        disabled={disabled}
        autoFocus={autoFocus}
        minLength={minLength}
        aria-invalid={error ? true : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "h-14 w-full rounded-xl bg-white/5 text-sm text-white transition-all duration-200 focus:outline-none disabled:opacity-50 pr-4 pt-5",
          icon ? "pl-12" : "px-4",
          focused
            ? "border border-primary/50 bg-white/[0.07] shadow-[0_0_12px_-4px_theme(colors.primary/0.25)]"
            : "border border-white/10",
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "absolute pointer-events-none transition-all duration-200",
          icon ? "left-12" : "left-4",
          isFloating
            ? "top-2 text-[11px] text-primary/60"
            : "top-1/2 -translate-y-1/2 text-sm text-white/40",
        )}
      >
        {label}
      </label>
      {error && (
        <p className="mt-1.5 text-xs text-red-400/80" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
