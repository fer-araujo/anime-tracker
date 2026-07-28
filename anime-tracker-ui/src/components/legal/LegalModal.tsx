"use client";

import { Modal } from "@/components/custom/Modal";
import { useResponsiveModalVariant } from "@/hooks/useResponsiveModalVariant";
import { TermsContent } from "./TermsContent";
import { PrivacyContent } from "./PrivacyContent";

type LegalType = "terms" | "privacy";

export function LegalModal({
  type,
  isOpen,
  onClose,
}: {
  type: LegalType;
  isOpen: boolean;
  onClose: () => void;
}) {
  const variant = useResponsiveModalVariant();

  const title = type === "terms" ? "Términos y Condiciones" : "Aviso de Privacidad";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant={variant}
      aria-labelledby="legal-modal-title"
    >
      <div className="p-6 max-h-[80dvh] overflow-y-auto text-left">
        <div className="prose prose-invert prose-headings:text-foreground prose-p:text-white/70 prose-li:text-white/60 prose-strong:text-white max-w-none text-sm">
          {type === "terms" ? <TermsContent /> : <PrivacyContent />}
        </div>
      </div>
    </Modal>
  );
}
