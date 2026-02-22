import React from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 flex items-center justify-center bg-white/5 border border-white/10", className)}>
      <ImageIcon className="w-8 h-8 text-white/20" />
    </div>
  );
}   