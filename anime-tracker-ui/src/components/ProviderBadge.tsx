"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Variant = "outline" | "dot" | "mono";

export type ProviderBadgeProps = {
  label: string;
  className?: string;
  variant?: Variant;
  title?: string;
};

const icons: Record<string, React.ReactNode> = {
  // monocromo, tamaño 14x14 aprox
  "Netflix": (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[14px] w-[14px]">
      <rect width="24" height="24" rx="3" className="fill-current opacity-20"/>
      <path d="M7 4h3l3.5 16H10.5L7 4Zm4 0h3l3.5 16H14.5L11 4Z" className="fill-current"/>
    </svg>
  ),
  "Amazon Prime Video": (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[14px] w-[14px]">
      <path d="M20.5 15c-3 2.5-8.5 4-12 3.5 3 .5 8.5-1 12-3.5Zm-7-7.5c.9-1.2 2.6-1 3.3.3.6 1.2.1 2.8-1 3.4l-1.1.6v1.2h-1.6V8.4l1.5-.9c.5-.3.7-.9.4-1.4-.3-.6-1-.7-1.5-.3l-.8.6-.9-1.1.7-.4Z" className="fill-current"/>
    </svg>
  ),
  "Crunchyroll": (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[14px] w-[14px]">
      <path d="M12 3a9 9 0 1 0 7.9 13.2 7 7 0 1 1-8.7-10.8A8.9 8.9 0 0 1 12 3Z" className="fill-current"/>
    </svg>
  ),
  "Disney+": (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[14px] w-[14px]">
      <path d="M3 15a9 9 0 0 1 18 0h-2a7 7 0 0 0-14 0H3Z" className="fill-current"/>
    </svg>
  ),
  "Hulu": (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[14px] w-[14px]">
      <rect x="4" y="8" width="4" height="8" className="fill-current"/>
      <rect x="10" y="8" width="4" height="8" className="fill-current"/>
      <rect x="16" y="8" width="4" height="8" className="fill-current"/>
    </svg>
  ),
  "Max": (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[14px] w-[14px]">
      <path d="M5 16V8h2l2 3 2-3h2v8h-2v-5l-2 3-2-3v5H5Z" className="fill-current"/>
    </svg>
  ),
};

function ProviderIcon({ label }: { label: string }) {
  const key =
    label === "Disney Plus" || label === "Disney" || label === "Star+" || label === "Star Plus"
      ? "Disney+"
      : label;
  return icons[key] ?? (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[14px] w-[14px]">
      <circle cx="12" cy="12" r="9" className="fill-current opacity-30"/>
      <circle cx="12" cy="12" r="5" className="fill-current"/>
    </svg>
  );
}

export function ProviderBadge({
  label,
  className,
  variant = "outline",
  title,
}: ProviderBadgeProps) {
  if (!label) return null;
  const common = "select-none whitespace-nowrap";

  if (variant === "dot") {
    return (
      <span
        title={title ?? label}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-white/10 bg-transparent px-2 py-1 text-[11px] text-muted-foreground",
          "hover:border-white/20 transition-colors",
          className
        )}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" />
        <span>{label}</span>
      </span>
    );
  }

  if (variant === "mono") {
    return (
      <span
        title={title ?? label}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-transparent px-2 py-1 text-[11px]",
          "text-foreground/85 hover:text-foreground hover:border-white/20 transition-colors",
          className
        )}
      >
        <span aria-hidden className="text-foreground/70"><ProviderIcon label={label} /></span>
        <span className={common}>{label}</span>
      </span>
    );
  }

  // outline (default): sutil, sin relleno
  return (
    <Badge
      variant="outline"
      title={title ?? label}
      className={cn(
        "border-white/12 text-foreground/80",
        "hover:border-white/20 hover:text-foreground",
        "px-2 py-1 text-[11px] rounded-full bg-transparent",
        className
      )}
    >
      {label}
    </Badge>
  );
}
