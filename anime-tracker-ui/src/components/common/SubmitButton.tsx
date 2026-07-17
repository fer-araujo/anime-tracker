"use client";

import Icon from "@/components/custom/Icon";

export function SubmitButton({
  label,
  loading,
  disabled,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="group relative flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
    >
      {loading ? (
        <Icon name="Loader2" size={18} className="animate-spin" />
      ) : (
        <>
          {label}
          <Icon
            name="ArrowRight"
            size={18}
            className="transition-transform group-hover:translate-x-1"
          />
        </>
      )}
    </button>
  );
}
