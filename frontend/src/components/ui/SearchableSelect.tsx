import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SearchableOption {
  value: string;
  label: string;
}

export function SearchableSelect({
  id,
  value,
  displayValue,
  options,
  onChange,
  onCreate,
  placeholder = 'Buscar…',
  allowClear = true,
}: {
  id?: string;
  value: string;
  displayValue: string;
  options: SearchableOption[];
  onChange: (value: string, label: string) => void;
  onCreate?: (texto: string) => Promise<SearchableOption>;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(displayValue);
  const [creando, setCreando] = useState(false);
  const cerrarTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!abierto) setTexto(displayValue);
  }, [displayValue, abierto]);

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [texto, options]);

  const coincideExacto = options.some((o) => o.label.toLowerCase() === texto.trim().toLowerCase());

  function abrir() {
    window.clearTimeout(cerrarTimeout.current);
    setAbierto(true);
  }

  function cerrarConDelay() {
    cerrarTimeout.current = window.setTimeout(() => {
      setAbierto(false);
      setTexto(displayValue);
    }, 120);
  }

  function elegir(o: SearchableOption) {
    onChange(o.value, o.label);
    setTexto(o.label);
    setAbierto(false);
  }

  async function crear() {
    if (!onCreate || !texto.trim()) return;
    setCreando(true);
    try {
      const nueva = await onCreate(texto.trim());
      elegir(nueva);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          id={id}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (e.target.value === '' && allowClear) onChange('', '');
          }}
          onFocus={abrir}
          onBlur={cerrarConDelay}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-8 pr-3 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {abierto && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-ink-200 bg-white py-1 shadow-lg">
          {filtradas.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => elegir(o)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50',
                o.value === value ? 'text-brand-700 font-medium' : 'text-ink-800',
              )}
            >
              {o.label}
              {o.value === value && <Check size={14} />}
            </button>
          ))}
          {filtradas.length === 0 && !onCreate && <p className="px-3 py-2 text-sm text-ink-400">Sin resultados.</p>}
          {onCreate && texto.trim() && !coincideExacto && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={crear}
              disabled={creando}
              className="flex w-full items-center gap-1.5 border-t border-ink-100 px-3 py-2 text-left text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              <Plus size={14} />
              {creando ? 'Creando…' : `Crear "${texto.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
