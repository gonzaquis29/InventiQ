import { useState, type ReactNode } from "react";
import { CircleHelp, Lightbulb, X } from "lucide-react";
import { AYUDA, type AyudaKey } from "@/lib/ayuda";
import { cn } from "@/lib/cn";

const storageKey = (key: AyudaKey) => `inventiq.ayuda.${key}.oculta`;

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Muestra el panel "¿Cómo funciona?" de esta pantalla (visible la primera vez, luego se puede ocultar). */
  ayuda?: AyudaKey;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  ayuda,
  className,
}: PageHeaderProps) {
  const [ayudaVisible, setAyudaVisible] = useState(
    () => !!ayuda && localStorage.getItem(storageKey(ayuda)) !== "1",
  );

  function toggleAyuda(visible: boolean) {
    if (!ayuda) return;
    setAyudaVisible(visible);
    localStorage.setItem(storageKey(ayuda), visible ? "0" : "1");
  }

  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-ink-900">
              {title}
            </h1>
            {ayuda && !ayudaVisible && (
              <button
                type="button"
                onClick={() => toggleAyuda(true)}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                title="¿Cómo funciona esta pantalla?"
              >
                <CircleHelp size={16} />
                Ayuda
              </button>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-sm text-ink-500">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-end gap-2">{actions}</div>
        )}
      </div>

      {ayuda && ayudaVisible && (
        <PanelAyuda ayudaKey={ayuda} onCerrar={() => toggleAyuda(false)} />
      )}
    </div>
  );
}

function PanelAyuda({
  ayudaKey,
  onCerrar,
}: {
  ayudaKey: AyudaKey;
  onCerrar: () => void;
}) {
  const { resumen, pasos } = AYUDA[ayudaKey];
  return (
    <div className="relative mt-5 rounded-2xl border border-brand-100 bg-brand-50 px-6 py-5">
      <button
        type="button"
        onClick={onCerrar}
        className="absolute right-3 top-3 rounded-md p-1 text-ink-400 transition-colors hover:bg-white hover:text-ink-700"
        aria-label="Ocultar ayuda"
      >
        <X size={16} />
      </button>
      <div className="flex gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
          <Lightbulb size={18} />
        </div>
        <div className="min-w-0 pr-6">
          <p className="font-display text-sm font-bold text-ink-900">
            ¿Cómo funciona?
          </p>
          <p className="mb-3 text-sm text-ink-600">{resumen}</p>
          <ol className="space-y-2">
            {pasos.map((paso, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-brand-700 ring-1 ring-brand-200">
                  {i + 1}
                </span>
                <span>{paso}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={onCerrar}
            className="mt-4 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Entendido, ocultar
          </button>
        </div>
      </div>
    </div>
  );
}
