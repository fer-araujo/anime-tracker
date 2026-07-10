import React from "react";
import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";

export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 flex items-center justify-center bg-white/5 border border-white/10", className)}>
      <Icon name="ImageIcon" size={32} className="text-white/20" />
    </div>
  );
}   