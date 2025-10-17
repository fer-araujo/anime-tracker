"use client";

import * as React from "react";
import { ProviderBadge } from "./ProviderBadge";
import { uniqueNormalizedProviders } from "@/lib/providers";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";

type GroupProps = {
  providers: string[];
  maxVisible?: number;      // cuántos mostrar antes de colapsar
  variant?: "outline" | "dot" | "mono";
  className?: string;
};

export function ProviderBadgesGroup({
  providers,
  maxVisible = 3,
  variant = "outline",
  className,
}: GroupProps) {
  const list = uniqueNormalizedProviders(providers);
  if (!list.length) return <ProviderBadge label="Pirata" variant={variant} />;

  const visible = list.slice(0, maxVisible);
  const hidden = list.slice(maxVisible);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visible.map((p) => (
        <ProviderBadge key={p} label={p} variant={variant} />
      ))}
      {hidden.length > 0 && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default rounded-full border border-white/10 px-2 py-1 text-[11px] text-muted-foreground hover:border-white/20">
                +{hidden.length}
                <span className="sr-only">Más plataformas</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {hidden.join(", ")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// util cn (si no lo tienes ya)
function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}
