"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";

export type SelectOption = {
  label: string;
  value: string;
};

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  dropdownUp?: boolean;
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  className,
  dropdownUp = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Soporte básico de teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center justify-between h-10 px-3 bg-white/10 border text-sm rounded-xl transition-all duration-300 backdrop-blur-xs focus:outline-none focus:ring-1 shadow-sm cursor-pointer",
          isOpen
            ? "border-primary/50 ring-1 ring-primary bg-black/40 text-foreground"
            : "border-white/10 text-foreground hover:bg-white/20"
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <Icon name="ChevronDown" size={16} className="text-white/50" />
        </motion.div>
      </button>

      {/* Menú Desplegable */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{
              opacity: 0,
              y: dropdownUp ? 10 : -10,
              scale: 0.95,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: dropdownUp ? 10 : -10,
              scale: 0.95,
            }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="listbox"
            className={cn(
              "absolute z-50 w-full py-1 max-h-60 overflow-auto bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent",
              dropdownUp ? "bottom-full mb-1" : "mt-2",
            )}
          >
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer transition-colors",
                  value === option.value
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-white/70 hover:bg-white/10 hover:text-foreground"
                )}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && (
                  <Icon name="Check" size={14} className="text-primary" />
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}