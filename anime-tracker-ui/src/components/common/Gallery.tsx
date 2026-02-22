"use client";
import React, { useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ArtworkCandidate } from "@/types/anime";

interface GalleryLightboxProps {
  images: ArtworkCandidate[];
  initialIndex: number;
  onClose: () => void;
}

export function GalleryLightbox({
  images,
  initialIndex,
  onClose,
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  const validImages = images.filter((img) => img.url_original) as {
    url_original: string;
  }[];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  // Navegación por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight")
        setCurrentIndex((prev) =>
          prev === validImages.length - 1 ? 0 : prev + 1,
        );
      if (e.key === "ArrowLeft")
        setCurrentIndex((prev) =>
          prev === 0 ? validImages.length - 1 : prev - 1,
        );
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, validImages.length]);

  if (validImages.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
      >
        <X className="w-6 h-6" />
      </button>

      <button
        onClick={handlePrev}
        className="absolute left-6 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors z-50"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>

      <div
        className="relative w-[85vw] h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={validImages[currentIndex].url_original}
          alt={`Artwork ${currentIndex + 1}`}
          fill
          className="object-contain"
          priority
        />
      </div>

      <button
        onClick={handleNext}
        className="absolute right-6 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors z-50"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm font-medium tracking-widest">
        {currentIndex + 1} / {validImages.length}
      </div>
    </div>
  );
}
