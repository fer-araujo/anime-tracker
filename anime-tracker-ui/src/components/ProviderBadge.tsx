import { cn } from "@/lib/utils";
import { ProviderLabel } from "@/types/anime";

const gradients: Record<ProviderLabel, string> = {

  Crunchyroll: "from-[#b85918] to-[#F47521]",
  Netflix:     "from-[#a0171b] to-[#D81F26]",
  Amazon:      "from-[#0080aa] to-[#00A8E1]",
  "Disney+":   "from-[#048ed1] to-[#06B2FF]",
  "HBO Max":   "from-[#1e0030] to-[#28003c]",
  Pirata:      "from-[#111111] to-[#2a2a2a]",
};

// Bandera pirata minimal (SVG propio)
function PirateFlagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-3.5 h-3.5 mr-1 -ml-0.5"
      aria-hidden="true"
      fill="currentColor"
    >
      {/* asta */}
      <rect x="3" y="3" width="2" height="18" rx="0.5" />
      {/* bandera ondeando */}
      <path d="M5 5c6 0 6-2 12 0v8c-6-2-6 2-12 0V5z" />
      {/* calavera sutil */}
      <circle cx="12" cy="10" r="2" fill="white" />
      <rect x="10" y="14" width="4" height="1.4" fill="white" rx="0.7" />
    </svg>
  );
}

export function ProviderBadge({ label }: { label: ProviderLabel }) {
  const gradient = gradients[label];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white",
        "bg-gradient-to-r",
        gradient
      )}
      title={label === "Pirata" ? "Solo pirata por ahora" : label}
    >
      {label === "Pirata" ? <PirateFlagIcon /> : null}
      {label}
    </span>
  );
}
