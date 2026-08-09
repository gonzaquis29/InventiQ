import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Wallet, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import type { CajaSesion, Producto, Venta } from '@/types';

export default function Dashboard() {
  const { usuario } = useAuth();
  const [stockBajo, setStockBajo] = useState<Producto[]>([]);
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([]);
  const [cajaActual, setCajaActual] = useState<CajaSesion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    Promise.all([
      api.get<Producto[]>('/productos/stock-bajo'),
      api.get<Venta[]>('/ventas', { params: { desde: hoy.toISOString() } }),
      api.get<CajaSesion | null>('/caja/actual'),
    ])
      .then(([stockRes, ventasRes, cajaRes]) => {
        setStockBajo(stockRes.data);
        setVentasHoy(ventasRes.data);
        setCajaActual(cajaRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalHoy = ventasHoy.filter((v) => !v.anulada).reduce((acc, v) => acc + Number(v.total), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Hola, {usuario?.nombre?.split(' ')[0]}</h1>
        <p className="text-sm text-ink-500">Esto es lo que está pasando en tu bazar hoy.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Ventas de hoy</p>
              <p className="font-display text-2xl font-extrabold text-ink-900">{loading ? '—' : formatMoney(totalHoy)}</p>
              <p className="text-xs text-ink-500">{ventasHoy.filter((v) => !v.anulada).length} ventas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-warn-bg text-amber-warn">
              <Package size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Stock bajo</p>
              <p className="font-display text-2xl font-extrabold text-ink-900">{loading ? '—' : stockBajo.length}</p>
              <p className="text-xs text-ink-500">productos por reponer</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Tu caja</p>
              <p className="text-xl font-semibold text-ink-900">
                {loading ? '—' : cajaActual ? 'Abierta' : 'Cerrada'}
              </p>
              <Link to="/caja" className="text-xs font-medium text-brand-600 hover:underline">
                {cajaActual ? 'Ver caja' : 'Abrir caja'}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos con stock bajo</CardTitle>
          <Link to="/inventario" className="text-sm font-medium text-brand-600 hover:underline">
            Ver inventario
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {stockBajo.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">
              {loading ? 'Cargando…' : 'No hay productos con stock bajo por ahora.'}
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {stockBajo.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-amber-warn" />
                    <span className="text-sm font-medium text-ink-900">{p.nombre}</span>
                  </div>
                  <Badge variant="warn">
                    {p.stock} / mín. {p.stockMinimo}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
