import { cn } from "@/lib/utils";

const BRAND = {
  "Netflix": "bg-brand-netflix",
  "Netflix (ads)": "bg-brand-netflix/80",
  "Max": "bg-brand-max",
  "Max (Prime Channels)": "bg-brand-max/85",
  "Prime Video": "bg-brand-prime",
  "Prime Video (ads)": "bg-brand-prime/80",
  "Disney+": "bg-brand-disney",
  "Crunchyroll": "bg-brand-crunchy",
  "Crunchyroll (Prime Channels)": "bg-brand-crunchy/85",
} as const;

export function ProviderBadge({ name }: { name: string }) {
  const brandClass = BRAND[name as keyof typeof BRAND] ?? "bg-muted";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white",
        "shadow", brandClass
      )}
      title={name}
    >
      {name}
    </span>
  );
}
