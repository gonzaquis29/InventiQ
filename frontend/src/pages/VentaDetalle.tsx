import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Ban, Printer, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnularVentaModal } from '@/components/ventas/AnularVentaModal';
import { imprimirComprobante } from '@/lib/comprobante';
import type { MetodoPago, Venta } from '@/types';

const METODO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE_PLIN: 'Yape / Plin',
  MIXTO: 'Mixto',
};

export default function VentaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMIN';

  const [venta, setVenta] = useState<Venta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);

  function cargar() {
    if (!id) return;
    setCargando(true);
    api
      .get<Venta>(`/ventas/${id}`)
      .then((res) => setVenta(res.data))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (cargando) return <p className="text-sm text-ink-500">Cargando…</p>;
  if (!venta) return <p className="text-sm text-ink-500">Venta no encontrada.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/ventas" className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800">
            <ChevronLeft size={14} />
            Ventas
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-ink-900">Venta #{venta.id.slice(0, 8).toUpperCase()}</h1>
            {venta.anulada ? <Badge variant="danger">Anulada</Badge> : <Badge variant="positive">Completada</Badge>}
          </div>
          <p className="text-sm text-ink-500">{formatDateTime(venta.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => imprimirComprobante(construirComprobante(venta))}>
            <Printer size={16} />
            Comprobante
          </Button>
          {esAdmin && !venta.anulada && (
            <Button variant="danger" onClick={() => setAnulandoId(venta.id)}>
              <Ban size={16} />
              Anular
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {venta.anulada && venta.motivoAnulacion && (
          <div className="flex items-start gap-2 rounded-lg border border-red-danger/30 bg-red-danger-bg px-4 py-3 text-sm text-red-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-medium">Motivo de anulación:</span> {venta.motivoAnulacion}
            </span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-ink-400">Vendedor</p>
                <p className="font-medium text-ink-800">{venta.usuario.nombre}</p>
              </div>
              <div>
                <p className="text-ink-400">Método de pago</p>
                <p className="font-medium text-ink-800">{METODO_LABEL[venta.metodoPago]}</p>
              </div>
              <div>
                <p className="text-ink-400">Total</p>
                <p className="font-display font-bold text-ink-900">{formatMoney(venta.total)}</p>
              </div>
              {Number(venta.montoEfectivo) > 0 && (
                <div>
                  <p className="text-ink-400">Efectivo</p>
                  <p className="font-medium text-ink-800">{formatMoney(venta.montoEfectivo)}</p>
                </div>
              )}
              {Number(venta.montoDigital) > 0 && (
                <div>
                  <p className="text-ink-400">Digital</p>
                  <p className="font-medium text-ink-800">{formatMoney(venta.montoDigital)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-ink-100">
              {venta.detalles.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-6 py-4 text-sm">
                  <div>
                    <p className="font-medium text-ink-900">{d.producto.nombre}</p>
                    <p className="text-xs text-ink-400">
                      {d.cantidad} {d.unidadVendida} × {formatMoney(d.precioUnitario)}
                      {Number(d.descuento) > 0 && <> · Descuento: {formatMoney(d.descuento)}</>}
                    </p>
                  </div>
                  <span className="font-medium text-ink-900">{formatMoney(Number(d.precioUnitario) * d.cantidad - Number(d.descuento))}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <AnularVentaModal
        ventaId={anulandoId}
        onClose={() => setAnulandoId(null)}
        onAnulada={() => {
          cargar();
          navigate(`/ventas/${id}`, { replace: true });
        }}
      />
    </div>
  );
}

function construirComprobante(venta: Venta) {
  return {
    id: venta.id,
    fecha: venta.createdAt,
    cajero: venta.usuario.nombre,
    items: venta.detalles.map((d) => ({
      nombre: d.producto.nombre,
      cantidad: d.cantidad,
      unidad: d.unidadVendida,
      precioUnitario: Number(d.precioUnitario),
      subtotal: Number(d.precioUnitario) * d.cantidad - Number(d.descuento),
    })),
    total: Number(venta.total),
    metodoPago: METODO_LABEL[venta.metodoPago],
    montoEfectivo: Number(venta.montoEfectivo) || undefined,
    anulada: venta.anulada,
  };
}
