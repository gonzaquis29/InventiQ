import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Pencil, PackagePlus, History, ShoppingBag, Ruler, Trash2, Plus, Tag, TrendingUp, ShoppingCart, Package } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { AjustarStockModal } from '@/components/inventario/AjustarStockModal';
import type { Categoria, Marca, MovimientoStock, Producto, UnidadMedida, UnidadProducto } from '@/types';

interface CompraHistorialProducto {
  id: string;
  createdAt: string;
  proveedor: { nombre: string };
  detalles: Array<{ productoId: string; cantidadComprada: number; unidadCompra: string; costoUnitarioCompra: string }>;
}

const emptyForm = {
  nombre: '',
  marca: '',
  codigoBarras: '',
  categoriaId: '',
  precioCompra: '',
  precioVenta: '',
  margenGanancia: '',
  unidad: 'unidad',
  stock: '',
  stockMinimo: '5',
};

function calcularMargen(compra: string, venta: string): string {
  const c = Number(compra);
  const v = Number(venta);
  if (!c || !v) return '';
  return (((v - c) / c) * 100).toFixed(1);
}

function calcularVentaDesdeMargen(compra: string, margen: string): string {
  const c = Number(compra);
  const m = Number(margen);
  if (!c) return '';
  return (c * (1 + m / 100)).toFixed(2);
}

export default function ProductoDetalle() {
  const { id } = useParams<{ id: string }>();
  const esNuevo = id === 'nuevo';
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { notify } = useToast();
  const esAdmin = usuario?.rol === 'ADMIN';

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(!esNuevo);
  const [modo, setModo] = useState<'ver' | 'editar'>(esNuevo ? 'editar' : 'ver');
  const [form, setForm] = useState(emptyForm);
  const [guardando, setGuardando] = useState(false);

  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [compras, setCompras] = useState<CompraHistorialProducto[]>([]);
  const [unidadesProducto, setUnidadesProducto] = useState<UnidadProducto[]>([]);
  const [nuevaUnidadNombre, setNuevaUnidadNombre] = useState('');
  const [nuevaUnidadFactor, setNuevaUnidadFactor] = useState('');
  const [agregandoUnidad, setAgregandoUnidad] = useState(false);

  const [ajusteAbierto, setAjusteAbierto] = useState(false);

  useEffect(() => {
    api.get<Categoria[]>('/categorias').then((res) => setCategorias(res.data));
    api.get<Marca[]>('/marcas').then((res) => setMarcas(res.data));
    api.get<UnidadMedida[]>('/unidades-medida').then((res) => setUnidadesMedida(res.data));
  }, []);

  function cargarProducto(productoId: string) {
    setCargando(true);
    api
      .get<Producto>(`/productos/${productoId}`)
      .then((res) => {
        setProducto(res.data);
        setUnidadesProducto(res.data.unidadesAlternativas);
        llenarForm(res.data);
      })
      .finally(() => setCargando(false));
    api.get<MovimientoStock[]>(`/productos/${productoId}/movimientos`).then((res) => setMovimientos(res.data));
    api.get<CompraHistorialProducto[]>('/compras', { params: { productoId } }).then((res) => setCompras(res.data));
  }

  useEffect(() => {
    if (!esNuevo && id) cargarProducto(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function llenarForm(p: Producto) {
    setForm({
      nombre: p.nombre,
      marca: p.marca ?? '',
      codigoBarras: p.codigoBarras ?? '',
      categoriaId: p.categoriaId ?? '',
      precioCompra: p.precioCompra,
      precioVenta: p.precioVenta,
      margenGanancia: p.margenGanancia ?? calcularMargen(p.precioCompra, p.precioVenta),
      unidad: p.unidad,
      stock: String(p.stock),
      stockMinimo: String(p.stockMinimo),
    });
  }

  function onChangePrecioCompra(valor: string) {
    setForm((f) => ({ ...f, precioCompra: valor, precioVenta: f.margenGanancia ? calcularVentaDesdeMargen(valor, f.margenGanancia) : f.precioVenta }));
  }

  function onChangePrecioVenta(valor: string) {
    setForm((f) => ({ ...f, precioVenta: valor, margenGanancia: calcularMargen(f.precioCompra, valor) }));
  }

  function onChangeMargen(valor: string) {
    setForm((f) => ({ ...f, margenGanancia: valor, precioVenta: calcularVentaDesdeMargen(f.precioCompra, valor) }));
  }

  async function guardarProducto(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre,
        marca: form.marca || undefined,
        codigoBarras: form.codigoBarras || undefined,
        categoriaId: form.categoriaId || undefined,
        precioCompra: form.precioCompra ? Number(form.precioCompra) : 0,
        precioVenta: Number(form.precioVenta),
        margenGanancia: form.margenGanancia ? Number(form.margenGanancia) : undefined,
        unidad: form.unidad || 'unidad',
        stock: form.stock ? Number(form.stock) : 0,
        stockMinimo: form.stockMinimo ? Number(form.stockMinimo) : 5,
      };
      if (producto) {
        const { data } = await api.patch<Producto>(`/productos/${producto.id}`, payload);
        notify('Producto actualizado');
        setProducto(data);
        setUnidadesProducto(data.unidadesAlternativas ?? []);
        setModo('ver');
      } else {
        const { data } = await api.post<Producto>('/productos', payload);
        notify('Producto creado');
        navigate(`/inventario/${data.id}`, { replace: true });
      }
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo guardar el producto'), 'error');
    } finally {
      setGuardando(false);
    }
  }

  async function crearCategoriaInline(nombre: string) {
    const { data } = await api.post<Categoria>('/categorias', { nombre });
    setCategorias((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return { value: data.id, label: data.nombre };
  }

  async function crearMarcaInline(nombre: string) {
    const { data } = await api.post<Marca>('/marcas', { nombre });
    setMarcas((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return { value: data.nombre, label: data.nombre };
  }

  async function crearUnidadMedidaInline(nombre: string) {
    const { data } = await api.post<UnidadMedida>('/unidades-medida', { nombre });
    setUnidadesMedida((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return { value: data.nombre, label: data.nombre };
  }

  async function agregarUnidadProducto(e: FormEvent) {
    e.preventDefault();
    if (!producto || !nuevaUnidadNombre.trim() || !nuevaUnidadFactor) return;
    setAgregandoUnidad(true);
    try {
      const { data } = await api.post<UnidadProducto>(`/productos/${producto.id}/unidades`, {
        nombre: nuevaUnidadNombre.trim(),
        factor: Number(nuevaUnidadFactor),
      });
      setUnidadesProducto((prev) => [...prev, data].sort((a, b) => Number(a.factor) - Number(b.factor)));
      setNuevaUnidadNombre('');
      setNuevaUnidadFactor('');
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo agregar la unidad'), 'error');
    } finally {
      setAgregandoUnidad(false);
    }
  }

  async function quitarUnidadProducto(u: UnidadProducto) {
    if (!producto) return;
    try {
      await api.delete(`/productos/${producto.id}/unidades/${u.id}`);
      setUnidadesProducto((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo quitar la unidad'), 'error');
    }
  }

  if (cargando) return <p className="text-sm text-ink-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/inventario" className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800">
            <ChevronLeft size={14} />
            Inventario
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink-900">
            {esNuevo ? 'Nuevo producto' : modo === 'editar' ? `Editando: ${producto?.nombre}` : producto?.nombre}
          </h1>
          {!esNuevo && producto?.marca && <p className="text-sm text-ink-500">{producto.marca}</p>}
        </div>
        {esAdmin && modo === 'ver' && producto && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAjusteAbierto(true)}>
              <PackagePlus size={16} />
              Ajustar stock
            </Button>
            <Button onClick={() => setModo('editar')}>
              <Pencil size={16} />
              Editar
            </Button>
          </div>
        )}
        {modo === 'editar' && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => (producto ? setModo('ver') : navigate('/inventario'))}>
              Cancelar
            </Button>
            <Button type="submit" form="form-producto" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        )}
      </div>

      {modo === 'ver' && producto && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <Tag size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Precio de venta</p>
                  <p className="text-xl font-semibold text-ink-900">{formatMoney(producto.precioVenta)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-bg text-emerald-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Margen</p>
                  <p className="text-xl font-semibold text-emerald-600">
                    +{producto.margenGanancia ?? calcularMargen(producto.precioCompra, producto.precioVenta)}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Precio de compra</p>
                  <p className="text-xl font-semibold text-ink-900">{formatMoney(producto.precioCompra)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className={producto.stock <= producto.stockMinimo ? 'border-amber-warn bg-amber-warn-bg' : undefined}>
              <CardContent className="flex items-center gap-3.5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                    producto.stock <= producto.stockMinimo ? 'bg-white/60 text-amber-warn' : 'bg-ink-100 text-ink-700'
                  }`}
                >
                  <Package size={20} />
                </div>
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${producto.stock <= producto.stockMinimo ? 'text-amber-warn' : 'text-ink-500'}`}>
                    Stock actual
                  </p>
                  <p className={`text-xl font-semibold ${producto.stock <= producto.stockMinimo ? 'text-amber-warn' : 'text-ink-900'}`}>
                    {producto.stock} <span className="text-sm font-normal opacity-70">{producto.unidad}</span>
                  </p>
                  {producto.stock <= producto.stockMinimo && <p className="text-xs text-amber-warn">Bajo el mínimo ({producto.stockMinimo})</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detalles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-ink-400">Categoría</p>
                      <p className="font-medium text-ink-800">{producto.categoria?.nombre ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-ink-400">Código de barras</p>
                      <p className="font-medium text-ink-800">{producto.codigoBarras ?? 'Sin código (opcional)'}</p>
                    </div>
                    <div>
                      <p className="text-ink-400">Stock mínimo</p>
                      <p className="font-medium text-ink-800">
                        {producto.stockMinimo} {producto.unidad}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-400">Estado</p>
                      <p className="font-medium text-ink-800">{producto.activo ? 'Activo' : 'Inactivo'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ruler size={16} />
                    Otras unidades para vender/comprar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {unidadesProducto.length === 0 ? (
                    <p className="text-sm text-ink-400">
                      Solo se maneja en "{producto.unidad}". Edita el producto para agregar otras (ej. paquete, ciento, millar).
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {unidadesProducto.map((u) => (
                        <li key={u.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                          <span className="text-ink-800">
                            1 {u.nombre} = {u.factor} {producto.unidad}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag size={16} />
                    Historial de compras
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {compras.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-ink-400">Nunca se ha comprado este producto a un proveedor.</p>
                  ) : (
                    <ul className="max-h-72 divide-y divide-ink-100 overflow-y-auto">
                      {compras.map((c) => {
                        const linea = c.detalles.find((d) => d.productoId === producto.id);
                        return (
                          <li key={c.id} className="px-5 py-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-ink-900">{c.proveedor.nombre}</span>
                              <span className="text-ink-500">{formatDateTime(c.createdAt)}</span>
                            </div>
                            {linea && (
                              <p className="text-xs text-ink-400">
                                {linea.cantidadComprada} {linea.unidadCompra} a {formatMoney(linea.costoUnitarioCompra)} c/u
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History size={16} />
                    Historial de movimientos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {movimientos.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-ink-400">Sin movimientos registrados.</p>
                  ) : (
                    <ul className="max-h-72 divide-y divide-ink-100 overflow-y-auto">
                      {movimientos.map((m) => (
                        <li key={m.id} className="flex items-center justify-between px-5 py-3 text-sm">
                          <div>
                            <p className="text-ink-800">{m.motivo ?? m.tipo}</p>
                            <p className="text-xs text-ink-400">
                              {formatDateTime(m.createdAt)} · {m.usuario.nombre}
                            </p>
                          </div>
                          <span className={`font-medium ${m.cantidad < 0 ? 'text-red-danger' : 'text-emerald-600'}`}>
                            {m.cantidad > 0 ? '+' : ''}
                            {m.cantidad}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {modo === 'editar' && (
        <form id="form-producto" onSubmit={guardarProducto} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input id="nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="marca">Marca</Label>
                  <SearchableSelect
                    id="marca"
                    value={form.marca}
                    displayValue={form.marca}
                    options={marcas.map((m) => ({ value: m.nombre, label: m.nombre }))}
                    onChange={(value) => setForm({ ...form, marca: value })}
                    onCreate={crearMarcaInline}
                    placeholder="Ej: Costeño"
                  />
                </div>
                <div>
                  <Label htmlFor="categoriaId">Categoría</Label>
                  <SearchableSelect
                    id="categoriaId"
                    value={form.categoriaId}
                    displayValue={categorias.find((c) => c.id === form.categoriaId)?.nombre ?? ''}
                    options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
                    onChange={(value) => setForm({ ...form, categoriaId: value })}
                    onCreate={crearCategoriaInline}
                    placeholder="Sin categoría"
                  />
                </div>
                <div>
                  <Label htmlFor="codigoBarras">Código de barras (opcional)</Label>
                  <Input
                    id="codigoBarras"
                    value={form.codigoBarras}
                    onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
                    placeholder="Escanéalo o déjalo vacío"
                  />
                </div>
                <div>
                  <Label htmlFor="unidad">Unidad estándar (para stock)</Label>
                  <SearchableSelect
                    id="unidad"
                    value={form.unidad}
                    displayValue={form.unidad}
                    options={unidadesMedida.map((u) => ({ value: u.nombre, label: u.nombre }))}
                    onChange={(value) => setForm({ ...form, unidad: value })}
                    onCreate={crearUnidadMedidaInline}
                    placeholder="unidad, hoja, kg…"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios y margen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="precioCompra">Precio de compra (S/)</Label>
                  <Input id="precioCompra" type="number" step="0.01" min="0" value={form.precioCompra} onChange={(e) => onChangePrecioCompra(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="margenGanancia">Margen (%)</Label>
                  <Input
                    id="margenGanancia"
                    type="number"
                    step="0.1"
                    value={form.margenGanancia}
                    onChange={(e) => onChangeMargen(e.target.value)}
                    placeholder="Ej: 30"
                  />
                </div>
                <div>
                  <Label htmlFor="precioVenta">Precio de venta (S/) *</Label>
                  <Input
                    id="precioVenta"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.precioVenta}
                    onChange={(e) => onChangePrecioVenta(e.target.value)}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-ink-400">Precio por "{form.unidad || 'unidad'}". Cambia cualquiera de los tres: los otros se recalculan solos.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="stock">Stock {producto ? 'actual' : 'inicial'} (en {form.unidad || 'unidad'})</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    disabled={!!producto}
                    placeholder="0"
                  />
                  {producto && <p className="mt-1 text-xs text-ink-400">Usa "Ajustar stock" para cambiar la cantidad.</p>}
                </div>
                <div>
                  <Label htmlFor="stockMinimo">Stock mínimo (alerta)</Label>
                  <Input id="stockMinimo" type="number" min="0" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {producto ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler size={16} />
                  Otras unidades para vender/comprar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-ink-400">
                  Ej: si la unidad estándar es "hoja", agrega "paquete" = 10, "ciento" = 100, "millar" = 1000. Se podrán elegir en POS y Compras.
                </p>
                {unidadesProducto.length > 0 && (
                  <ul className="mb-3 space-y-1.5">
                    {unidadesProducto.map((u) => (
                      <li key={u.id} className="flex items-center justify-between rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2 text-sm">
                        <span className="text-ink-800">
                          1 {u.nombre} = {u.factor} {form.unidad || 'unidad'}
                        </span>
                        <button type="button" onClick={() => quitarUnidadProducto(u)} className="text-ink-400 hover:text-red-danger">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="nuevaUnidadNombre" className="text-xs">
                      Nombre
                    </Label>
                    <SearchableSelect
                      id="nuevaUnidadNombre"
                      value={nuevaUnidadNombre}
                      displayValue={nuevaUnidadNombre}
                      options={unidadesMedida.filter((u) => u.nombre !== form.unidad).map((u) => ({ value: u.nombre, label: u.nombre }))}
                      onChange={(value) => {
                        setNuevaUnidadNombre(value);
                        const preset = unidadesMedida.find((u) => u.nombre === value);
                        if (preset?.factor) setNuevaUnidadFactor(String(preset.factor));
                      }}
                      onCreate={crearUnidadMedidaInline}
                      placeholder="Ej: paquete"
                    />
                  </div>
                  <div className="w-28">
                    <Label htmlFor="nuevaUnidadFactor" className="text-xs">
                      Equivale a
                    </Label>
                    <Input
                      id="nuevaUnidadFactor"
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={nuevaUnidadFactor}
                      onChange={(e) => setNuevaUnidadFactor(e.target.value)}
                      placeholder="Ej: 10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!nuevaUnidadNombre.trim() || !nuevaUnidadFactor || agregandoUnidad}
                    onClick={agregarUnidadProducto}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs text-ink-400">Guarda el producto primero para poder agregarle otras unidades de venta/compra.</p>
          )}
        </form>
      )}

      {producto && <AjustarStockModal producto={ajusteAbierto ? producto : null} onClose={() => setAjusteAbierto(false)} onAjustado={() => cargarProducto(producto.id)} />}
    </div>
  );
}
