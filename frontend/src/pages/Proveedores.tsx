import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Ban, X, History } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { Proveedor } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';

interface CompraProveedor {
  id: string;
  total: string;
  createdAt: string;
  usuario: { nombre: string };
  detalles: Array<{ cantidad: number; producto: { nombre: string } }>;
}

const emptyForm = { nombre: '', contacto: '', ruc: '' };

export default function Proveedores() {
  const { notify } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [guardando, setGuardando] = useState(false);

  const [detalle, setDetalle] = useState<Proveedor | null>(null);
  const [compras, setCompras] = useState<CompraProveedor[]>([]);
  const [comprasLoading, setComprasLoading] = useState(false);

  function cargar() {
    setLoading(true);
    api
      .get<Proveedor[]>('/proveedores', { params: { soloActivos: !mostrarInactivos } })
      .then((res) => setProveedores(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarInactivos]);

  function abrirNuevo() {
    setEditando(null);
    setForm(emptyForm);
    setModalAbierto(true);
  }

  function abrirEditar(p: Proveedor) {
    setEditando(p);
    setForm({ nombre: p.nombre, contacto: p.contacto ?? '', ruc: p.ruc ?? '' });
    setDetalle(null);
    setModalAbierto(true);
  }

  async function abrirDetalle(p: Proveedor) {
    setDetalle(p);
    setComprasLoading(true);
    try {
      const { data } = await api.get<CompraProveedor[]>('/compras', { params: { proveedorId: p.id } });
      setCompras(data);
    } finally {
      setComprasLoading(false);
    }
  }

  async function guardarProveedor(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const payload = { nombre: form.nombre, contacto: form.contacto || undefined, ruc: form.ruc || undefined };
      if (editando) {
        await api.patch(`/proveedores/${editando.id}`, payload);
        notify('Proveedor actualizado');
      } else {
        await api.post('/proveedores', payload);
        notify('Proveedor creado');
      }
      setModalAbierto(false);
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo guardar el proveedor'), 'error');
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(p: Proveedor) {
    try {
      await api.delete(`/proveedores/${p.id}`);
      notify('Proveedor desactivado');
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo desactivar el proveedor'), 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description={`${proveedores.length} proveedores`}
        ayuda="proveedores"
        actions={
          <>
            <button
              onClick={() => setMostrarInactivos((v) => !v)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                mostrarInactivos ? 'border-ink-300 bg-ink-100 text-ink-700' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              {mostrarInactivos ? 'Ocultar inactivos' : 'Mostrar inactivos'}
            </button>
            <Button onClick={abrirNuevo}>
              <Plus size={16} />
              Nuevo proveedor
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-6 py-4">Proveedor</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">RUC</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {proveedores.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-ink-50" onClick={() => abrirDetalle(p)}>
                    <td className="px-6 py-4 font-medium text-ink-900">{p.nombre}</td>
                    <td className="px-6 py-4 text-ink-600">{p.contacto || '—'}</td>
                    <td className="px-6 py-4 text-ink-600">{p.ruc || '—'}</td>
                    <td className="px-6 py-4">
                      {p.activo ? <Badge variant="positive">Activo</Badge> : <Badge variant="neutral">Inactivo</Badge>}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => abrirEditar(p)} title="Editar">
                          <Pencil size={16} />
                        </Button>
                        {p.activo && (
                          <Button variant="ghost" size="sm" onClick={() => desactivar(p)} title="Desactivar">
                            <Ban size={16} className="text-red-danger" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && proveedores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                      Aún no registras proveedores.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Editar proveedor' : 'Nuevo proveedor'}>
        <form onSubmit={guardarProveedor} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="contacto">Contacto</Label>
            <Input
              id="contacto"
              value={form.contacto}
              onChange={(e) => setForm({ ...form, contacto: e.target.value })}
              placeholder="Teléfono o persona de contacto"
            />
          </div>
          <div>
            <Label htmlFor="ruc">RUC</Label>
            <Input id="ruc" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar proveedor'}
          </Button>
        </form>
      </Modal>

      {detalle && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setDetalle(null)} />
          <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-ink-100 px-6 py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{detalle.activo ? 'Activo' : 'Inactivo'}</p>
                <h2 className="font-display text-xl font-bold text-ink-900">{detalle.nombre}</h2>
              </div>
              <button onClick={() => setDetalle(null)} className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 px-6 py-5 text-sm">
              <div>
                <p className="text-ink-400">Contacto</p>
                <p className="font-medium text-ink-800">{detalle.contacto || '—'}</p>
              </div>
              <div>
                <p className="text-ink-400">RUC</p>
                <p className="font-medium text-ink-800">{detalle.ruc || '—'}</p>
              </div>
            </div>

            <div className="flex-1 border-t border-ink-100 px-6 py-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
                <History size={16} />
                Historial de compras
              </div>
              {comprasLoading ? (
                <p className="text-sm text-ink-400">Cargando…</p>
              ) : compras.length === 0 ? (
                <p className="text-sm text-ink-400">Sin compras registradas a este proveedor.</p>
              ) : (
                <ul className="space-y-2">
                  {compras.map((c) => (
                    <li key={c.id} className="rounded-lg border border-ink-100 px-3 py-2 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-ink-800">{formatDateTime(c.createdAt)}</span>
                        <span className="font-display font-bold text-ink-900">{formatMoney(c.total)}</span>
                      </div>
                      <p className="text-xs text-ink-400">
                        {c.detalles.length} ítems · registrado por {c.usuario.nombre}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-ink-100 px-6 py-4">
              <Button className="w-full" variant="outline" onClick={() => abrirEditar(detalle)}>
                <Pencil size={16} />
                Editar proveedor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
