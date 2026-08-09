import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { MetodoPago, Venta } from '@/types';

const METODO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE_PLIN: 'Yape / Plin',
  MIXTO: 'Mixto',
};

export default function Ventas() {
  const navigate = useNavigate();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Venta[]>('/ventas')
      .then((res) => setVentas(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Ventas</h1>
        <p className="text-sm text-ink-500">Historial de ventas registradas</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Vendedor</th>
                  <th className="px-5 py-3">Método</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {ventas.map((v) => (
                  <tr key={v.id} className="cursor-pointer hover:bg-ink-50" onClick={() => navigate(`/ventas/${v.id}`)}>
                    <td className="px-5 py-3 text-ink-600">{formatDateTime(v.createdAt)}</td>
                    <td className="px-5 py-3 text-ink-600">{v.usuario.nombre}</td>
                    <td className="px-5 py-3 text-ink-600">{METODO_LABEL[v.metodoPago]}</td>
                    <td className="px-5 py-3">
                      {v.anulada ? <Badge variant="danger">Anulada</Badge> : <Badge variant="positive">Completada</Badge>}
                    </td>
                    <td className={`px-5 py-3 text-right font-medium ${v.anulada ? 'text-ink-400 line-through' : 'text-ink-900'}`}>
                      {formatMoney(v.total)}
                    </td>
                  </tr>
                ))}
                {!loading && ventas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                      Aún no hay ventas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
