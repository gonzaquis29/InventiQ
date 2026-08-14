import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface CompraDetalleData {
  id: string;
  total: string;
  createdAt: string;
  proveedor: { id: string; nombre: string; contacto: string | null; ruc: string | null };
  usuario: { nombre: string };
  detalles: Array<{
    id: string;
    unidadCompra: string;
    factorUnidad: string;
    cantidadComprada: number;
    costoUnitarioCompra: string;
    cantidad: number;
    costoUnitario: string;
    producto: { nombre: string; unidad: string };
  }>;
}

export default function CompraDetalle() {
  const { id } = useParams<{ id: string }>();
  const [compra, setCompra] = useState<CompraDetalleData | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!id) return;
    setCargando(true);
    api
      .get<CompraDetalleData>(`/compras/${id}`)
      .then((res) => setCompra(res.data))
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <p className="text-sm text-ink-500">Cargando…</p>;
  if (!compra) return <p className="text-sm text-ink-500">Compra no encontrada.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link to="/compras" className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800">
          <ChevronLeft size={14} />
          Compras
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink-900">Compra #{compra.id.slice(0, 8).toUpperCase()}</h1>
        <p className="text-sm text-ink-500">{formatDateTime(compra.createdAt)}</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-ink-400">Proveedor</p>
                <p className="font-medium text-ink-800">{compra.proveedor.nombre}</p>
              </div>
              <div>
                <p className="text-ink-400">Contacto</p>
                <p className="font-medium text-ink-800">{compra.proveedor.contacto || '—'}</p>
              </div>
              <div>
                <p className="text-ink-400">Registrado por</p>
                <p className="font-medium text-ink-800">{compra.usuario.nombre}</p>
              </div>
              <div>
                <p className="text-ink-400">Total</p>
                <p className="font-display font-bold text-ink-900">{formatMoney(compra.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos recibidos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-ink-100">
              {compra.detalles.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-6 py-4 text-sm">
                  <div>
                    <p className="font-medium text-ink-900">{d.producto.nombre}</p>
                    <p className="text-xs text-ink-400">
                      {d.cantidadComprada} {d.unidadCompra} a {formatMoney(d.costoUnitarioCompra)} c/u
                      {' · '}
                      equivale a {d.cantidad} {d.producto.unidad} ({formatMoney(d.costoUnitario)} c/u)
                    </p>
                  </div>
                  <span className="font-medium text-ink-900">{formatMoney(Number(d.costoUnitarioCompra) * d.cantidadComprada)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
