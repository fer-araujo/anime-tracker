"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Modal } from "@/components/custom/Modal";
import Icon from "@/components/custom/Icon";
import { createList } from "@/actions/lists";

const COLOR_OPTIONS = [
  { value: "blue", bg: "bg-sky-500", label: "Azul" },
  { value: "purple", bg: "bg-purple-500", label: "Púrpura" },
  { value: "emerald", bg: "bg-emerald-500", label: "Verde" },
  { value: "amber", bg: "bg-amber-500", label: "Ámbar" },
  { value: "pink", bg: "bg-pink-500", label: "Rosa" },
];

export function CreateListDialog({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await createList(name.trim(), color ?? undefined);
    if (result.success) {
      setName("");
      setColor(null);
      onCreated();
      onClose();
    } else {
      setError(result.error ?? "Error al crear la lista");
    }
    setSubmitting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="center"
      aria-labelledby="create-list-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-5"
      >
        <div className="flex items-center gap-3 pb-2 border-b border-white/5">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary">
            <Icon name="Plus" size={16} />
          </div>
          <h2 id="create-list-title" className="text-lg font-bold text-white">
            Nueva colección
          </h2>
        </div>

        {/* Name input */}
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-2">
            Nombre
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Joyas Ocultas"
            autoFocus
            maxLength={50}
            className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Color picker */}
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-2">
            Color
          </label>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`w-8 h-8 rounded-full ${c.bg} transition-all cursor-pointer ${
                  color === c.value
                    ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110"
                    : "hover:scale-105"
                }`}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2">
            <Icon name="AlertCircle" size={14} />
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creando..." : "Crear colección"}
          </button>
        </div>
      </motion.div>
    </Modal>
  );
}
