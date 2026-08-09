import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Paginated, Producto, Proveedor, UnidadMedida } from '@/types';

interface CompraHistorial {
  id: string;
  total: string;
  createdAt: string;
  proveedor: { nombre: string };
  usuario: { nombre: string };
  detalles: Array<{
    cantidadComprada: number;
    unidadCompra: string;
    costoUnitarioCompra: string;
    producto: { nombre: string };
  }>;
}

interface LineaCompra {
  producto: Producto;
  unidadCompra: string;
  factorUnidad: number;
  cantidadComprada: number;
  costoUnitarioCompra: number;
}

export default function Compras() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [compras, setCompras] = useState<CompraHistorial[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [proveedorId, setProveedorId] = useState('');
  const [nuevoProveedor, setNuevoProveedor] = useState(false);
  const [proveedorForm, setProveedorForm] = useState({ nombre: '', contacto: '', ruc: '' });

  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [lineas, setLineas] = useState<LineaCompra[]>([]);
  const [guardando, setGuardando] = useState(false);

  function cargarCompras() {
    setLoading(true);
    api
      .get<CompraHistorial[]>('/compras')
      .then((res) => setCompras(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargarCompras();
    api.get<Proveedor[]>('/proveedores', { params: { soloActivos: true } }).then((res) => setProveedores(res.data));
    api.get<UnidadMedida[]>('/unidades-medida').then((res) => setUnidadesMedida(res.data));
  }, []);

  const unidadesCompraPreset = unidadesMedida.map((u) => ({
    value: u.nombre,
    label: u.factor ? `${u.nombre} (${u.factor})` : u.nombre,
    factor: u.factor ?? 0,
  }));

  useEffect(() => {
    if (!q) {
      setResultados([]);
      return;
    }
    const timeout = setTimeout(() => {
      api.get<Paginated<Producto>>('/productos', { params: { q, pageSize: 6 } }).then((res) => setResultados(res.data.data));
    }, 200);
    return () => clearTimeout(timeout);
  }, [q]);

  function abrirModal() {
    setProveedorId('');
    setNuevoProveedor(false);
    setProveedorForm({ nombre: '', contacto: '', ruc: '' });
    setLineas([]);
    setQ('');
    setModalAbierto(true);
  }

  function agregarLinea(producto: Producto) {
    setLineas((prev) => {
      if (prev.some((l) => l.producto.id === producto.id)) return prev;
      return [
        ...prev,
        {
          producto,
          unidadCompra: producto.unidad,
          factorUnidad: 1,
          cantidadComprada: 1,
          costoUnitarioCompra: Number(producto.precioCompra) || 0,
        },
      ];
    });
    setQ('');
    setResultados([]);
  }

  // Unidades propias del producto primero (lo que realmente se configuró para él en Inventario),
  // más el catálogo global como respaldo para lo que todavía no se haya guardado en el producto.
  function opcionesUnidadCompra(l: LineaCompra) {
    const propias = [
      { value: l.producto.unidad, label: `${l.producto.unidad} (unidad estándar)`, factor: 1 },
      ...l.producto.unidadesAlternativas.map((u) => ({ value: u.nombre, label: `${u.nombre} (${u.factor})`, factor: Number(u.factor) })),
    ];
    const extras = unidadesCompraPreset.filter((u) => !propias.some((p) => p.value === u.value));
    return [...propias, ...extras];
  }

  function actualizarLinea(productoId: string, cambios: Partial<LineaCompra>) {
    setLineas((prev) => prev.map((l) => (l.producto.id === productoId ? { ...l, ...cambios } : l)));
  }

  function quitarLinea(productoId: string) {
    setLineas((prev) => prev.filter((l) => l.producto.id !== productoId));
  }

  const total = lineas.reduce((acc, l) => acc + l.cantidadComprada * l.costoUnitarioCompra, 0);

  async function registrarCompra(e: FormEvent) {
    e.preventDefault();
    if (lineas.length === 0) {
      notify('Agrega al menos un producto', 'error');
      return;
    }
    setGuardando(true);
    try {
      let idProveedor = proveedorId;
      if (nuevoProveedor) {
        const { data } = await api.post<Proveedor>('/proveedores', {
          nombre: proveedorForm.nombre,
          contacto: proveedorForm.contacto || undefined,
          ruc: proveedorForm.ruc || undefined,
        });
        idProveedor = data.id;
      }
      if (!idProveedor) {
        notify('Selecciona o crea un proveedor', 'error');
        setGuardando(false);
        return;
      }

      await api.post('/compras', {
        proveedorId: idProveedor,
        detalles: lineas.map((l) => ({
          productoId: l.producto.id,
          unidadCompra: l.unidadCompra,
          factorUnidad: l.factorUnidad,
          cantidadComprada: l.cantidadComprada,
          costoUnitarioCompra: l.costoUnitarioCompra,
        })),
      });
      notify('Compra registrada, stock actualizado');
      setModalAbierto(false);
      cargarCompras();
      api.get<Proveedor[]>('/proveedores', { params: { soloActivos: true } }).then((res) => setProveedores(res.data));
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo registrar la compra'), 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Compras</h1>
          <p className="text-sm text-ink-500">Ingresos de mercadería de tus proveedores</p>
        </div>
        <Button onClick={abrirModal}>
          <Plus size={16} />
          Nueva compra
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Proveedor</th>
                  <th className="px-5 py-3">Productos</th>
                  <th className="px-5 py-3">Registrado por</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {compras.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-ink-50" onClick={() => navigate(`/compras/${c.id}`)}>
                    <td className="px-5 py-3 text-ink-600">{formatDateTime(c.createdAt)}</td>
                    <td className="px-5 py-3 font-medium text-ink-900">{c.proveedor.nombre}</td>
                    <td className="px-5 py-3 text-ink-600">{c.detalles.length} ítems</td>
                    <td className="px-5 py-3 text-ink-600">{c.usuario.nombre}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-900">{formatMoney(c.total)}</td>
                  </tr>
                ))}
                {!loading && compras.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                      Aún no registras compras.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={modalAbierto} onClose={() => setModalAbierto(false)} title="Nueva compra" widthClass="max-w-2xl">
        <form onSubmit={registrarCompra} className="space-y-5">
          <div>
            <Label htmlFor="proveedor">Proveedor</Label>
            {!nuevoProveedor ? (
              <div className="flex gap-2">
                <Select id="proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} required={!nuevoProveedor}>
                  <option value="">Selecciona un proveedor</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="outline" onClick={() => setNuevoProveedor(true)}>
                  Nuevo
                </Button>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-ink-100 p-3">
                <Input
                  required
                  placeholder="Nombre del proveedor *"
                  value={proveedorForm.nombre}
                  onChange={(e) => setProveedorForm({ ...proveedorForm, nombre: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Contacto"
                    value={proveedorForm.contacto}
                    onChange={(e) => setProveedorForm({ ...proveedorForm, contacto: e.target.value })}
                  />
                  <Input
                    placeholder="RUC"
                    value={proveedorForm.ruc}
                    onChange={(e) => setProveedorForm({ ...proveedorForm, ruc: e.target.value })}
                  />
                </div>
                <button type="button" onClick={() => setNuevoProveedor(false)} className="text-xs font-medium text-brand-600 hover:underline">
                  Usar proveedor existente
                </button>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="buscarProducto">Agregar productos</Label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <Input
                id="buscarProducto"
                className="pl-9"
                placeholder="Buscar producto…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {resultados.length > 0 && (
              <div className="mt-1 rounded-lg border border-ink-100 bg-white shadow-sm">
                {resultados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => agregarLinea(p)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50"
                  >
                    <span>{p.nombre}</span>
                    <span className="text-ink-400">stock: {p.stock}</span>
                  </button>
                ))}
              </div>
            )}
            {q.trim() && resultados.length === 0 && (
              <p className="mt-1.5 text-xs text-ink-400">
                Ningún producto coincide.{' '}
                <Link to="/inventario/nuevo" target="_blank" className="font-medium text-brand-600 hover:underline">
                  Créalo en Inventario
                </Link>{' '}
                y vuelve a buscarlo aquí.
              </p>
            )}
          </div>

          {lineas.length > 0 && (
            <div className="space-y-3">
              {lineas.map((l) => {
                const unidadesRecibidas = l.cantidadComprada * l.factorUnidad;
                const costoPorUnidadVenta = l.factorUnidad ? l.costoUnitarioCompra / l.factorUnidad : 0;
                return (
                  <div key={l.producto.id} className="rounded-lg border border-ink-100 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-ink-900">{l.producto.nombre}</span>
                      <button type="button" onClick={() => quitarLinea(l.producto.id)} className="text-ink-400 hover:text-red-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Compra por</Label>
                        <Select
                          value={l.unidadCompra}
                          onChange={(e) => {
                            const preset = opcionesUnidadCompra(l).find((u) => u.value === e.target.value);
                            actualizarLinea(l.producto.id, {
                              unidadCompra: e.target.value,
                              factorUnidad: preset?.factor || l.factorUnidad,
                            });
                          }}
                        >
                          {opcionesUnidadCompra(l).map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs"># de venta c/u</Label>
                        <Input
                          type="number"
                          min="1"
                          value={l.factorUnidad}
                          onChange={(e) => actualizarLinea(l.producto.id, { factorUnidad: Number(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          value={l.cantidadComprada}
                          onChange={(e) => actualizarLinea(l.producto.id, { cantidadComprada: Number(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Costo por {l.unidadCompra}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.costoUnitarioCompra}
                          onChange={(e) => actualizarLinea(l.producto.id, { costoUnitarioCompra: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-ink-500">
                      Recibirás <span className="font-medium text-ink-800">{unidadesRecibidas} {l.producto.unidad}</span> a{' '}
                      <span className="font-medium text-ink-800">{formatMoney(costoPorUnidadVenta)}</span> c/u · Subtotal:{' '}
                      <span className="font-medium text-ink-800">{formatMoney(l.cantidadComprada * l.costoUnitarioCompra)}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-lg font-semibold text-ink-900">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>

          <Button type="submit" className="w-full" disabled={guardando}>
            {guardando ? 'Registrando…' : 'Registrar compra'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
