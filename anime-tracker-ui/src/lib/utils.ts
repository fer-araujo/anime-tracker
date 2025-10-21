import { clsx, type ClassValue } from "clsx";
import { Dispatch, SetStateAction, SyntheticEvent } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---- Handlers ----
export const handleImageLoad = (
  e: SyntheticEvent<HTMLImageElement>,
  setOverlayMode: Dispatch<SetStateAction<"base" | "ultra">>,
  autoContrast: boolean
) => {
  if (!autoContrast) return;
  try {
    const img = e.currentTarget as HTMLImageElement;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sampleW = 120;
    const sampleH = 80; // zona superior
    canvas.width = sampleW;
    canvas.height = sampleH;
    ctx.drawImage(
      img,
      0,
      0,
      width,
      Math.max(1, Math.floor(height * 0.4)),
      0,
      0,
      sampleW,
      sampleH
    );
    const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sum += lum;
    }
    const avg = sum / (sampleW * sampleH);
    if (avg > 175) setOverlayMode(() => "ultra");
    else setOverlayMode(() => "base");
  } catch {
    // noop
  }
};
