"use client";

import { motion } from "framer-motion";
import Icon from "@/components/custom/Icon";

export function CreateListCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="group relative flex flex-col items-center justify-center w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/50 transition-all duration-300 cursor-pointer"
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 group-hover:bg-primary/20 group-hover:text-primary text-white/40 transition-colors mb-3">
        <Icon name="Plus" size={24} />
      </div>
      <p className="text-sm font-medium text-white/50 group-hover:text-white transition-colors">
        Crear nueva colección
      </p>
    </motion.div>
  );
}
