"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Icon from "@/components/custom/Icon";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type BannerVariant = "error" | "success";

interface FormBannerProps {
  variant: BannerVariant;
  message: string;
}

/* -------------------------------------------------------------------------- */
/*  Variant styles                                                             */
/* -------------------------------------------------------------------------- */

const variantStyles: Record<
  BannerVariant,
  { container: string; icon: string; iconName: "AlertCircle" | "Check" }
> = {
  error: {
    container:
      "bg-red-500/[0.06] border-red-500/[0.12] text-red-300/80",
    icon: "text-red-400/60",
    iconName: "AlertCircle",
  },
  success: {
    container:
      "bg-emerald-500/[0.06] border-emerald-500/[0.12] text-emerald-300/80",
    icon: "text-emerald-400/60",
    iconName: "Check",
  },
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function FormBanner({ variant, message }: FormBannerProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        styles.container,
      )}
    >
      <Icon
        name={styles.iconName}
        size={16}
        className={cn("mt-0.5 shrink-0", styles.icon)}
      />
      <span>{message}</span>
    </motion.div>
  );
}
