import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MetodoPago, Paginated, Venta } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';

const PAGE_SIZE = 25;

const METODO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE_PLIN: 'Yape / Plin',
  MIXTO: 'Mixto',
};

export default function Ventas() {
  const navigate = useNavigate();
  const [resultado, setResultado] = useState<Paginated<Venta> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated<Venta>>('/ventas', { params: { page, pageSize: PAGE_SIZE } })
      .then((res) => setResultado(res.data))
      .finally(() => setLoading(false));
  }, [page]);

  const ventas = resultado?.data ?? [];
  const totalPaginas = resultado ? Math.max(Math.ceil(resultado.total / PAGE_SIZE), 1) : 1;

  return (
    <div>
      <PageHeader
        title="Ventas"
        description={resultado ? `${resultado.total} ventas registradas` : 'Historial de ventas registradas'}
        ayuda="ventas"
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Vendedor</th>
                  <th className="px-6 py-4">Método</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {ventas.map((v) => (
                  <tr key={v.id} className="cursor-pointer hover:bg-ink-50" onClick={() => navigate(`/ventas/${v.id}`)}>
                    <td className="px-6 py-4 text-ink-600">{formatDateTime(v.createdAt)}</td>
                    <td className="px-6 py-4 text-ink-600">{v.usuario.nombre}</td>
                    <td className="px-6 py-4 text-ink-600">{METODO_LABEL[v.metodoPago]}</td>
                    <td className="px-6 py-4">
                      {v.anulada ? <Badge variant="danger">Anulada</Badge> : <Badge variant="positive">Completada</Badge>}
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${v.anulada ? 'text-ink-400 line-through' : 'text-ink-900'}`}>
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

          {resultado && resultado.total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-ink-100 px-6 py-4">
              <p className="text-xs text-ink-500">
                Página {page} de {totalPaginas}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPaginas || loading}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
