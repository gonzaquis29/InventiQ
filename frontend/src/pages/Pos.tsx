import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, ScanBarcode, PackageX, AlertTriangle, Printer, CheckCircle2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { imprimirComprobante, type ComprobanteData } from '@/lib/comprobante';
import type { CajaSesion, Categoria, ItemCarrito, MetodoPago, Paginated, Producto } from '@/types';

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'YAPE_PLIN', label: 'Yape / Plin' },
  { value: 'MIXTO', label: 'Mixto' },
];

function claveItem(productoId: string, unidadNombre: string) {
  return `${productoId}::${unidadNombre}`;
}

function opcionesUnidad(producto: Producto) {
  return [
    { nombre: producto.unidad, factor: 1 },
    ...producto.unidadesAlternativas.map((u) => ({ nombre: u.nombre, factor: Number(u.factor) })),
  ];
}

function precioPorDefecto(producto: Producto, factor: number) {
  return Number((Number(producto.precioVenta) * factor).toFixed(2));
}

export default function Pos() {
  const { usuario } = useAuth();
  const { notify } = useToast();
  const [cajaActual, setCajaActual] = useState<CajaSesion | null>(null);
  const [cajaLoading, setCajaLoading] = useState(true);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [q, setQ] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [montoEfectivoMixto, setMontoEfectivoMixto] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [recibo, setRecibo] = useState<ComprobanteData | null>(null);

  useEffect(() => {
    api
      .get<CajaSesion | null>('/caja/actual')
      .then((res) => setCajaActual(res.data))
      .finally(() => setCajaLoading(false));
    api.get<Categoria[]>('/categorias').then((res) => setCategorias(res.data));
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      api
        .get<Paginated<Producto>>('/productos', { params: { q: q || undefined, categoriaId: categoriaId || undefined, pageSize: 60 } })
        .then((res) => setProductos(res.data.data));
    }, 150);
    return () => clearTimeout(timeout);
  }, [q, categoriaId]);

  function agregarProducto(producto: Producto, unidadNombre = producto.unidad) {
    const opcion = opcionesUnidad(producto).find((u) => u.nombre === unidadNombre) ?? { nombre: producto.unidad, factor: 1 };
    const clave = claveItem(producto.id, opcion.nombre);

    if (producto.stock <= 0) {
      notify(`"${producto.nombre}" no tiene stock disponible`, 'error');
      return;
    }
    setCarrito((prev) => {
      const existente = prev.find((i) => claveItem(i.producto.id, i.unidadNombre) === clave);
      const cantidadBaseActual = prev
        .filter((i) => i.producto.id === producto.id)
        .reduce((acc, i) => acc + i.cantidad * i.factorUnidad, 0);
      if (cantidadBaseActual + opcion.factor > producto.stock) {
        notify(`Solo hay ${producto.stock} ${producto.unidad} de "${producto.nombre}"`, 'error');
        return prev;
      }
      if (existente) {
        return prev.map((i) => (claveItem(i.producto.id, i.unidadNombre) === clave ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [
        ...prev,
        {
          producto,
          unidadNombre: opcion.nombre,
          factorUnidad: opcion.factor,
          cantidad: 1,
          precioUnitario: precioPorDefecto(producto, opcion.factor),
          descuento: 0,
        },
      ];
    });
  }

  async function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !q.trim()) return;
    e.preventDefault();
    try {
      const { data } = await api.get<Producto>(`/productos/codigo/${encodeURIComponent(q.trim())}`);
      agregarProducto(data);
      setQ('');
    } catch {
      if (productos[0]) {
        agregarProducto(productos[0]);
        setQ('');
      }
    }
  }

  function cambiarCantidad(clave: string, delta: number) {
    setCarrito((prev) =>
      prev
        .map((i) => {
          if (claveItem(i.producto.id, i.unidadNombre) !== clave) return i;
          const nueva = i.cantidad + delta;
          if (nueva * i.factorUnidad > i.producto.stock) {
            notify(`Solo hay ${i.producto.stock} ${i.producto.unidad} de "${i.producto.nombre}"`, 'error');
            return i;
          }
          return { ...i, cantidad: nueva };
        })
        .filter((i) => i.cantidad > 0),
    );
  }

  function cambiarUnidad(clave: string, unidadNombre: string) {
    setCarrito((prev) =>
      prev.map((i) => {
        if (claveItem(i.producto.id, i.unidadNombre) !== clave) return i;
        const opcion = opcionesUnidad(i.producto).find((u) => u.nombre === unidadNombre);
        if (!opcion) return i;
        return { ...i, unidadNombre: opcion.nombre, factorUnidad: opcion.factor, cantidad: 1, precioUnitario: precioPorDefecto(i.producto, opcion.factor) };
      }),
    );
  }

  function cambiarPrecio(clave: string, precio: number) {
    setCarrito((prev) => prev.map((i) => (claveItem(i.producto.id, i.unidadNombre) === clave ? { ...i, precioUnitario: precio } : i)));
  }

  function quitarProducto(clave: string) {
    setCarrito((prev) => prev.filter((i) => claveItem(i.producto.id, i.unidadNombre) !== clave));
  }

  const total = useMemo(() => carrito.reduce((acc, i) => acc + i.cantidad * i.precioUnitario - i.descuento, 0), [carrito]);

  const vuelto = metodoPago === 'EFECTIVO' && montoRecibido ? Number(montoRecibido) - total : 0;

  function limpiarVenta() {
    setCarrito([]);
    setMontoRecibido('');
    setMontoEfectivoMixto('');
    setMetodoPago('EFECTIVO');
  }

  function abrirConfirmacion() {
    if (carrito.length === 0) return;
    if (metodoPago === 'EFECTIVO' && Number(montoRecibido || 0) < total) {
      notify('El monto recibido es menor al total', 'error');
      return;
    }
    setConfirmando(true);
  }

  async function confirmarVenta() {
    setProcesando(true);
    try {
      const payload: Record<string, unknown> = {
        detalles: carrito.map((i) => ({
          productoId: i.producto.id,
          // Normalizado a la unidad estándar del producto: stock/caja/reportes no necesitan saber
          // en qué unidad se vendió realmente — esa info va solo en unidadVendida/factorUnidad.
          cantidad: Math.round(i.cantidad * i.factorUnidad),
          precioUnitario: Number((i.precioUnitario / i.factorUnidad).toFixed(4)),
          descuento: i.descuento,
          unidadVendida: i.unidadNombre,
          factorUnidad: i.factorUnidad,
        })),
        metodoPago,
      };
      if (metodoPago === 'MIXTO') {
        payload.montoEfectivo = Number(montoEfectivoMixto || 0);
        payload.montoDigital = Math.max(total - Number(montoEfectivoMixto || 0), 0);
      }
      const { data: venta } = await api.post<{ id: string; createdAt: string }>('/ventas', payload);
      notify('Venta registrada correctamente');
      setRecibo({
        id: venta.id,
        fecha: venta.createdAt,
        cajero: usuario?.nombre ?? '',
        items: carrito.map((i) => ({
          nombre: i.producto.nombre,
          cantidad: i.cantidad,
          unidad: i.unidadNombre,
          precioUnitario: i.precioUnitario,
          subtotal: i.cantidad * i.precioUnitario - i.descuento,
        })),
        total,
        metodoPago: METODOS.find((m) => m.value === metodoPago)?.label ?? metodoPago,
        montoEfectivo: metodoPago === 'EFECTIVO' ? Number(montoRecibido || 0) : undefined,
        vuelto: metodoPago === 'EFECTIVO' ? Math.max(vuelto, 0) : undefined,
      });
      setConfirmando(false);
      limpiarVenta();
      const cajaRes = await api.get<CajaSesion | null>('/caja/actual');
      setCajaActual(cajaRes.data);
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo registrar la venta'), 'error');
      setConfirmando(false);
    } finally {
      setProcesando(false);
    }
  }

  if (!cajaLoading && !cajaActual) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-warn-bg text-amber-warn">
          <ScanBarcode size={26} />
        </div>
        <h1 className="mb-1 font-display text-xl font-bold text-ink-900">Abre tu caja para empezar a vender</h1>
        <p className="mb-5 max-w-sm text-sm text-ink-500">
          Antes de registrar ventas necesitas abrir tu caja del día con el monto inicial de efectivo.
        </p>
        <Link to="/caja" className={buttonVariants({ variant: 'primary', size: 'md' })}>
          Ir a Caja diaria
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
      <div>
        <h1 className="mb-4 font-display text-2xl font-bold text-ink-900">Punto de venta</h1>

        <div className="relative mb-4">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Escanea un código o busca por nombre…"
            className="h-12 pl-10 text-base"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setCategoriaId('')}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              categoriaId === '' ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50'
            }`}
          >
            Todos
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoriaId(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                categoriaId === c.id ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50'
              }`}
            >
              {c.nombre}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {productos.map((p) => (
            <button
              key={p.id}
              onClick={() => agregarProducto(p)}
              disabled={p.stock <= 0}
              className="flex flex-col items-start rounded-xl border border-ink-200 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(20,22,31,0.04)] transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {p.stock <= 0 ? (
                <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-red-danger">
                  <PackageX size={12} /> Sin stock
                </span>
              ) : (
                <span className="mb-1 text-xs text-ink-400">
                  {p.stock} {p.unidad} disp.
                </span>
              )}
              <span className="text-sm font-medium leading-snug text-ink-900">{p.nombre}</span>
              {p.marca && <span className="text-xs text-ink-400">{p.marca}</span>}
              <span className="mt-2 font-display text-base font-extrabold text-ink-900">{formatMoney(p.precioVenta)}</span>
              {p.unidadesAlternativas.length > 0 && (
                <span className="mt-1 text-[11px] text-ink-400">
                  también por {p.unidadesAlternativas.map((u) => u.nombre).join(', ')}
                </span>
              )}
            </button>
          ))}
          {productos.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-ink-400">No hay productos que coincidan.</p>
          )}
        </div>
      </div>

      <Card className="flex h-fit flex-col lg:sticky lg:top-8">
        <CardContent className="flex flex-col gap-4">
          <h2 className="font-display text-base font-bold text-ink-900">Carrito ({carrito.length})</h2>

          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {carrito.length === 0 && <p className="py-6 text-center text-sm text-ink-400">Aún no hay productos.</p>}
            {carrito.map((item) => {
              const clave = claveItem(item.producto.id, item.unidadNombre);
              const opciones = opcionesUnidad(item.producto);
              const precioEsperado = precioPorDefecto(item.producto, item.factorUnidad);
              const precioDistinto = Math.abs(item.precioUnitario - precioEsperado) > 0.001;
              return (
                <div key={clave} className="rounded-lg border border-ink-100 p-2.5">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink-900">{item.producto.nombre}</p>
                    <button onClick={() => quitarProducto(clave)} className="shrink-0 text-ink-400 hover:text-red-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => cambiarCantidad(clave, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-ink-100 text-ink-600 hover:bg-ink-200"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.cantidad}</span>
                      <button
                        onClick={() => cambiarCantidad(clave, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-ink-100 text-ink-600 hover:bg-ink-200"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {opciones.length > 1 ? (
                      <select
                        value={item.unidadNombre}
                        onChange={(e) => cambiarUnidad(clave, e.target.value)}
                        className="h-7 rounded-md border border-ink-200 bg-white px-1.5 text-xs text-ink-700 outline-none focus:border-brand-500"
                      >
                        {opciones.map((o) => (
                          <option key={o.nombre} value={o.nombre}>
                            {o.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-ink-400">{item.unidadNombre}</span>
                    )}

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.precioUnitario}
                      onChange={(e) => cambiarPrecio(clave, Number(e.target.value) || 0)}
                      className="h-7 w-20 rounded-md border border-ink-200 bg-white px-1.5 text-right text-xs text-ink-900 outline-none focus:border-brand-500"
                    />

                    <span className="w-16 text-right text-sm font-medium text-ink-900">
                      {formatMoney(item.cantidad * item.precioUnitario - item.descuento)}
                    </span>
                  </div>

                  {precioDistinto && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-warn">
                      <AlertTriangle size={11} />
                      Ojo: precio de catálogo es {formatMoney(precioEsperado)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-ink-100 pt-3">
            <div className="mb-3 flex items-center justify-between font-display text-lg font-bold text-ink-900">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>

            <Label>Método de pago</Label>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMetodoPago(m.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    metodoPago === m.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {metodoPago === 'EFECTIVO' && (
              <div className="mb-3">
                <Label htmlFor="recibido">Monto recibido (S/)</Label>
                <Input
                  id="recibido"
                  type="number"
                  min="0"
                  step="0.10"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  placeholder={total.toFixed(2)}
                />
                {montoRecibido && (
                  <p className={`mt-1 text-sm font-medium ${vuelto < 0 ? 'text-red-danger' : 'text-emerald-600'}`}>
                    Vuelto: {formatMoney(Math.max(vuelto, 0))}
                  </p>
                )}
              </div>
            )}

            {metodoPago === 'MIXTO' && (
              <div className="mb-3">
                <Label htmlFor="mixtoEfectivo">Parte en efectivo (S/)</Label>
                <Input
                  id="mixtoEfectivo"
                  type="number"
                  min="0"
                  max={total}
                  step="0.10"
                  value={montoEfectivoMixto}
                  onChange={(e) => setMontoEfectivoMixto(e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-500">
                  Resto en digital: {formatMoney(Math.max(total - Number(montoEfectivoMixto || 0), 0))}
                </p>
              </div>
            )}

            <Button className="w-full" size="lg" disabled={carrito.length === 0 || procesando} onClick={abrirConfirmacion}>
              Cobrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal open={confirmando} onClose={() => setConfirmando(false)} title="Confirmar cobro">
        <div className="space-y-4">
          <ul className="max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-ink-100 p-3">
            {carrito.map((i) => (
              <li key={claveItem(i.producto.id, i.unidadNombre)} className="flex justify-between text-sm">
                <span className="text-ink-700">
                  {i.cantidad} {i.unidadNombre} × {i.producto.nombre}
                </span>
                <span className="font-medium text-ink-900">{formatMoney(i.cantidad * i.precioUnitario - i.descuento)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between font-display text-lg font-bold text-ink-900">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
          <p className="text-sm text-ink-600">
            Método: <span className="font-medium text-ink-900">{METODOS.find((m) => m.value === metodoPago)?.label}</span>
            {metodoPago === 'EFECTIVO' && montoRecibido && (
              <>
                {' · '}Vuelto: <span className="font-medium text-ink-900">{formatMoney(Math.max(vuelto, 0))}</span>
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button type="button" className="flex-1" disabled={procesando} onClick={confirmarVenta}>
              {procesando ? 'Procesando…' : 'Confirmar cobro'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!recibo} onClose={() => setRecibo(null)} title="Venta registrada">
        {recibo && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-bg px-4 py-3 text-emerald-600">
              <CheckCircle2 size={18} />
              <span className="text-sm font-medium">Venta cobrada correctamente.</span>
            </div>
            <div className="flex items-center justify-between font-display text-lg font-bold text-ink-900">
              <span>Total cobrado</span>
              <span>{formatMoney(recibo.total)}</span>
            </div>
            {recibo.vuelto !== undefined && recibo.vuelto > 0 && (
              <p className="text-sm text-ink-600">
                Vuelto entregado: <span className="font-medium text-ink-900">{formatMoney(recibo.vuelto)}</span>
              </p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => imprimirComprobante(recibo)}>
                <Printer size={16} />
                Imprimir / PDF
              </Button>
              <Button type="button" className="flex-1" onClick={() => setRecibo(null)}>
                Nueva venta
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
