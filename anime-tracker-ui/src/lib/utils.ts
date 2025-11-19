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

export function getAspectClass(aspect?: number | null) {
  if (!aspect) return "aspect-video"; // fallback 16:9
  if (aspect > 2.1) return "aspect-[21/9]"; // cinematic widescreen
  if (aspect > 1.9) return "aspect-[19/9]";
  if (aspect > 1.7) return "aspect-video";
  if (aspect > 1.5) return "aspect-[3/2]";
  return "aspect-[4/3]"; // muy cuadrado o viejo
}

export function getScaleClass(aspect?: number | null) {
  if (!aspect) return "scale-100";
  if (aspect > 2.1) return "scale-[1.08]";
  if (aspect > 1.9) return "scale-[1.05]";
  return "scale-100";
}
