"use client";
import React, { useEffect, useRef } from "react";
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
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const validImages = images.filter((img) => img.url_original) as {
    url_original: string;
  }[];

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  // Navegación por teclado y FOCUS TRAP
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();

      // --- LA MAGIA DEL FOCUS TRAP ---
      if (e.key === "Tab") {
        const modal = document.getElementById("gallery-lightbox");
        if (!modal) return;

        // Buscamos todos los elementos enfocables DENTRO de este modal
        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Si presiona Shift + Tab (ir hacia atrás) estando en el primer elemento
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Si presiona Tab normal (ir hacia adelante) estando en el último elemento
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Usamos capture (true) para interceptar el tab antes de que el navegador lo mueva
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, validImages.length]);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  if (validImages.length === 0) return null;

  return (
    <div
      id="gallery-lightbox" // <-- EL ID PARA EL FOCUS TRAP
      role="dialog"
      aria-modal="true"
      aria-label="Visor de galería de imágenes"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div aria-live="polite" className="sr-only">
        Mostrando imagen {currentIndex + 1} de {validImages.length}
      </div>

      <button
        ref={closeBtnRef}
        onClick={onClose}
        aria-label="Cerrar visor"
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="w-6 h-6" aria-hidden="true" />
      </button>

      <button
        onClick={handlePrev}
        aria-label="Imagen anterior"
        className="absolute left-6 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronLeft className="w-8 h-8" aria-hidden="true" />
      </button>

      <div
        className="relative w-[85vw] h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={validImages[currentIndex].url_original}
          alt={`Imagen ${currentIndex + 1} de la galería`}
          fill
          className="object-contain"
          priority
        />
      </div>

      <button
        onClick={handleNext}
        aria-label="Siguiente imagen"
        className="absolute right-6 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronRight className="w-8 h-8" aria-hidden="true" />
      </button>

      <div
        aria-hidden="true"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm font-medium tracking-widest"
      >
        {currentIndex + 1} / {validImages.length}
      </div>
    </div>
  );
}
