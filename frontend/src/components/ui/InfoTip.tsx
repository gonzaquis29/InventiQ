import type { ReactNode } from "react";
import { Info } from "lucide-react";

/** Ícono "i" con una explicación corta al pasar el mouse o enfocar con teclado. */
export function InfoTip({ children }: { children: ReactNode }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        className="rounded-full text-ink-400 transition-colors hover:text-ink-700 focus-visible:text-ink-700 focus-visible:outline-none"
        aria-label="Más información"
      >
        <Info size={14} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-lg bg-navy-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}
