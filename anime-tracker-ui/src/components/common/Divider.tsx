/* -------------------------------------------------------------------------- */
/*  Divider — horizontal separator with centered label                        */
/* -------------------------------------------------------------------------- */

interface DividerProps {
  label?: string;
}

export function Divider({ label = "o" }: DividerProps) {
  return (
    <div className="flex items-center gap-3 my-6" aria-hidden="true">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
        {label}
      </span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
