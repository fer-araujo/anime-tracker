"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import Icon from "@/components/custom/Icon";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type ModalVariant = "center" | "bottom-sheet";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: ModalVariant;
  "aria-labelledby"?: string;
}

/* -------------------------------------------------------------------------- */
/*  Focusable elements selector                                                */
/* -------------------------------------------------------------------------- */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                         */
/* -------------------------------------------------------------------------- */

const centerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: "easeOut" } },
};

const bottomSheetVariants: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } },
  exit: { y: "100%", transition: { duration: 0.25, ease: "easeOut" } },
};

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/* -------------------------------------------------------------------------- */
/*  Modal                                                                      */
/* -------------------------------------------------------------------------- */

export function Modal({
  isOpen,
  onClose,
  children,
  variant = "center",
  "aria-labelledby": ariaLabelledBy,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const isCenter = variant === "center";

  // SSR guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus trap + ESC + scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Save trigger for focus restoration
    triggerRef.current = document.activeElement as HTMLElement;

    // Scroll lock
    document.body.style.overflow = "hidden";

    // Focus first focusable element
    const raf = requestAnimationFrame(() => {
      if (contentRef.current) {
        const first = contentRef.current.querySelector(FOCUSABLE) as HTMLElement | null;
        first?.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && contentRef.current) {
        const focusables = contentRef.current.querySelectorAll(FOCUSABLE);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0] as HTMLElement;
        const last = focusables[focusables.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Reduced motion check
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const getContentVariants = (): Variants => {
    if (prefersReduced) return reducedVariants;
    return isCenter ? centerVariants : bottomSheetVariants;
  };

  const getBackdropVariants = (): Variants => {
    if (prefersReduced) return reducedVariants;
    return backdropVariants;
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          variants={getBackdropVariants()}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-40 bg-black/60"
          aria-hidden="true"
          onClick={handleBackdropClick}
        />
      )}

      {isOpen && (
        <motion.div
          key="content"
          ref={contentRef}
          variants={getContentVariants()}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledBy}
          className={cn(
            "fixed z-50",
            isCenter
              ? "inset-0 flex items-center justify-center p-4"
              : "inset-x-0 bottom-0 flex items-end justify-center",
          )}
          onClick={handleBackdropClick}
        >
          <div
            className={cn(
              isCenter
                ? "max-w-md w-full rounded-xl border border-white/10 bg-neutral-900 shadow-2xl"
                : "w-full max-h-[85dvh] rounded-t-xl border border-white/10 bg-neutral-900 shadow-2xl overflow-y-auto",
            )}
          >
            {/* Bottom-sheet drag handle */}
            {!isCenter && (
              <div className="sticky top-0 z-10 bg-neutral-900 rounded-t-xl pt-2 pb-1 flex justify-center">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
            )}

            {/* Bottom-sheet close button */}
            {!isCenter && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Cerrar"
              >
                <Icon name="X" size={16} className="text-white/80" />
              </button>
            )}

            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
