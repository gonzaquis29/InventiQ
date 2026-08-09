import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Check, X, Search } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ItemCatalogo {
  id: string;
  nombre: string;
  factor?: number | null;
}

export function CatalogoSimple({
  descripcion,
  endpoint,
  conFactor = false,
  factorLabel = 'Equivale a',
  placeholderFactor = 'Ej: 12 (opcional)',
}: {
  descripcion?: string;
  endpoint: string;
  conFactor?: boolean;
  factorLabel?: string;
  placeholderFactor?: string;
}) {
  const { notify } = useToast();
  const [items, setItems] = useState<ItemCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoFactor, setNuevoFactor] = useState('');
  const [creando, setCreando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editFactor, setEditFactor] = useState('');

  function cargar() {
    setLoading(true);
    api
      .get<ItemCatalogo[]>(endpoint)
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    setFiltro('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.nombre.toLowerCase().includes(q));
  }, [items, filtro]);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    try {
      await api.post(endpoint, {
        nombre: nuevoNombre.trim(),
        ...(conFactor && nuevoFactor ? { factor: Number(nuevoFactor) } : {}),
      });
      setNuevoNombre('');
      setNuevoFactor('');
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo agregar'), 'error');
    } finally {
      setCreando(false);
    }
  }

  function empezarEdicion(item: ItemCatalogo) {
    setEditandoId(item.id);
    setEditNombre(item.nombre);
    setEditFactor(item.factor ? String(item.factor) : '');
  }

  async function guardarEdicion(id: string) {
    if (!editNombre.trim()) return;
    try {
      await api.patch(`${endpoint}/${id}`, {
        nombre: editNombre.trim(),
        ...(conFactor && editFactor ? { factor: Number(editFactor) } : {}),
      });
      setEditandoId(null);
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo actualizar'), 'error');
    }
  }

  async function eliminar(item: ItemCatalogo) {
    try {
      await api.delete(`${endpoint}/${item.id}`);
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo eliminar'), 'error');
    }
  }

  return (
    <div>
      {descripcion && <p className="mb-3 text-xs text-ink-500">{descripcion}</p>}

      {items.length > 6 && (
        <div className="relative mb-3">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar…" className="h-9 pl-8" />
        </div>
      )}

      <div className="rounded-lg border border-ink-100">
        <ul className="max-h-96 divide-y divide-ink-100 overflow-y-auto">
          {filtrados.map((item) => (
            <li key={item.id} className="flex items-center gap-2 px-4 py-2.5">
              {editandoId === item.id ? (
                <>
                  <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="h-8 flex-1" autoFocus />
                  {conFactor && (
                    <Input
                      type="number"
                      min="1"
                      value={editFactor}
                      onChange={(e) => setEditFactor(e.target.value)}
                      className="h-8 w-28"
                      placeholder={placeholderFactor}
                    />
                  )}
                  <Button variant="ghost" size="sm" onClick={() => guardarEdicion(item.id)} title="Guardar">
                    <Check size={16} className="text-emerald-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditandoId(null)} title="Cancelar">
                    <X size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-ink-900">{item.nombre}</span>
                  {conFactor && (
                    <span className="text-xs text-ink-500">{item.factor ? `${factorLabel}: ${item.factor}` : 'sin equivalencia fija'}</span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => empezarEdicion(item)} title="Editar">
                    <Pencil size={15} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => eliminar(item)} title="Eliminar">
                    <Trash2 size={15} className="text-red-danger" />
                  </Button>
                </>
              )}
            </li>
          ))}
          {!loading && filtrados.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ink-400">{items.length === 0 ? 'Nada por aquí todavía.' : 'Sin resultados.'}</li>
          )}
        </ul>

        <form onSubmit={agregar} className="flex items-center gap-2 border-t border-ink-100 px-4 py-3">
          <Input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nuevo…" className="h-9 flex-1" />
          {conFactor && (
            <Input
              type="number"
              min="1"
              value={nuevoFactor}
              onChange={(e) => setNuevoFactor(e.target.value)}
              placeholder={placeholderFactor}
              className="h-9 w-32"
            />
          )}
          <Button type="submit" size="sm" disabled={!nuevoNombre.trim() || creando}>
            <Plus size={15} />
            Agregar
          </Button>
        </form>
      </div>
    </div>
  );
}
