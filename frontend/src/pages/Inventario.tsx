import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Pencil, PackagePlus, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ImportarProductosModal } from '@/components/inventario/ImportarProductosModal';
import { AjustarStockModal } from '@/components/inventario/AjustarStockModal';
import type { Categoria, Marca, Paginated, Producto } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';

const PAGE_SIZE = 10;

function calcularMargen(compra: string, venta: string): string {
  const c = Number(compra);
  const v = Number(venta);
  if (!c || !v) return '';
  return (((v - c) / c) * 100).toFixed(1);
}

const DIAS_PRODUCTO_NUEVO = 7;

function diasDesde(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / (24 * 60 * 60 * 1000));
}

function esProductoNuevo(p: Producto): boolean {
  if (!p.createdAt) return false;
  return diasDesde(p.createdAt) < DIAS_PRODUCTO_NUEVO;
}

export default function Inventario() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const esAdmin = usuario?.rol === 'ADMIN';

  const [resultado, setResultado] = useState<Paginated<Producto> | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [marca, setMarca] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(searchParams.get('stockBajo') === 'true');
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [ajusteProducto, setAjusteProducto] = useState<Producto | null>(null);
  const [importarAbierto, setImportarAbierto] = useState(false);

  function cargarProductos() {
    setLoading(true);
    api
      .get<Paginated<Producto>>('/productos', {
        params: {
          q: q || undefined,
          categoriaId: categoriaId || undefined,
          marca: marca || undefined,
          stockBajo: soloStockBajo || undefined,
          nuevos: soloNuevos || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((res) => setResultado(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    api.get<Categoria[]>('/categorias').then((res) => setCategorias(res.data));
    api.get<Marca[]>('/marcas').then((res) => setMarcas(res.data));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(cargarProductos, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoriaId, marca, soloStockBajo, soloNuevos, page]);

  useEffect(() => {
    setPage(1);
  }, [q, categoriaId, marca, soloStockBajo, soloNuevos]);

  const totalPaginas = useMemo(() => (resultado ? Math.max(Math.ceil(resultado.total / PAGE_SIZE), 1) : 1), [resultado]);
  const productos = resultado?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Inventario"
        description={`${resultado?.total ?? '—'} productos`}
        ayuda="inventario"
        actions={
          esAdmin && (
            <>
              <Button variant="outline" onClick={() => setImportarAbierto(true)}>
                <Upload size={16} />
                Importar
              </Button>
              <Button onClick={() => navigate('/inventario/nuevo')}>
                <Plus size={16} />
                Nuevo producto
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input placeholder="Buscar por nombre, marca o código…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="w-52">
          <SearchableSelect
            value={categoriaId}
            displayValue={categorias.find((c) => c.id === categoriaId)?.nombre ?? ''}
            onChange={(value) => setCategoriaId(value)}
            options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
            placeholder="Todas las categorías"
          />
        </div>
        <div className="w-52">
          <SearchableSelect
            value={marca}
            displayValue={marca}
            onChange={(value) => setMarca(value)}
            options={marcas.map((m) => ({ value: m.nombre, label: m.nombre }))}
            placeholder="Todas las marcas"
          />
        </div>
        <button
          onClick={() => setSoloStockBajo((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            soloStockBajo ? 'border-amber-warn bg-amber-warn-bg text-amber-warn' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
          }`}
        >
          Solo stock bajo
        </button>
        <button
          onClick={() => setSoloNuevos((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            soloNuevos ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
          }`}
          title={`Agregados en los últimos ${DIAS_PRODUCTO_NUEVO} días`}
        >
          Solo nuevos
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Precio venta</th>
                  <th className="px-6 py-4">Margen</th>
                  <th className="px-6 py-4">Stock</th>
                  {esAdmin && <th className="px-6 py-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {productos.map((p) => {
                  const margen = p.margenGanancia ?? calcularMargen(p.precioCompra, p.precioVenta);
                  return (
                    <tr key={p.id} className="cursor-pointer hover:bg-ink-50" onClick={() => navigate(`/inventario/${p.id}`)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-ink-900">{p.nombre}</p>
                          {esProductoNuevo(p) && p.createdAt && (
                            <Badge variant="brand" title={`Agregado hace ${diasDesde(p.createdAt)} día(s)`}>
                              Nuevo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-ink-400">{[p.marca, p.codigoBarras].filter(Boolean).join(' · ') || '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-ink-600">{p.categoria?.nombre ?? '—'}</td>
                      <td className="px-6 py-4 text-ink-900">{formatMoney(p.precioVenta)}</td>
                      <td className="px-6 py-4">
                        {margen ? <span className="text-emerald-600 font-medium">+{margen}%</span> : <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {p.stock <= p.stockMinimo ? (
                          <Badge variant="warn">
                            {p.stock} {p.unidad}
                          </Badge>
                        ) : (
                          <span className="text-ink-700">
                            {p.stock} {p.unidad}
                          </span>
                        )}
                      </td>
                      {esAdmin && (
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setAjusteProducto(p)} title="Ajustar stock">
                              <PackagePlus size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/inventario/${p.id}`)} title="Editar">
                              <Pencil size={16} />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {!loading && productos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-ink-500">
                      No se encontraron productos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {resultado && resultado.total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-ink-100 px-6 py-4">
              <p className="text-xs text-ink-500">
                Página {page} de {totalPaginas}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AjustarStockModal producto={ajusteProducto} onClose={() => setAjusteProducto(null)} onAjustado={cargarProductos} />
      <ImportarProductosModal open={importarAbierto} onClose={() => setImportarAbierto(false)} onImportado={cargarProductos} />
    </div>
  );
}
