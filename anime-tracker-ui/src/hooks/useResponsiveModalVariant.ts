"use client";

import { useState, useEffect } from "react";

export function useResponsiveModalVariant() {
  const [variant, setVariant] = useState<"center" | "bottom-sheet">("center");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setVariant(mq.matches ? "bottom-sheet" : "center");
    const handler = (e: MediaQueryListEvent) =>
      setVariant(e.matches ? "bottom-sheet" : "center");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return variant;
}
