import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ShoppingCart, Wallet, Package, Truck, Receipt, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import type { CajaSesion, Producto, Venta } from '@/types';

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [stockBajo, setStockBajo] = useState<Producto[]>([]);
  const [recientes, setRecientes] = useState<Venta[]>([]);
  const [cajaActual, setCajaActual] = useState<CajaSesion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<Producto[]>('/productos/stock-bajo'), api.get<Venta[]>('/ventas'), api.get<CajaSesion | null>('/caja/actual')])
      .then(([stockRes, ventasRes, cajaRes]) => {
        setStockBajo(stockRes.data);
        setRecientes(ventasRes.data.slice(0, 5));
        setCajaActual(cajaRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const acciones = [
    {
      label: 'Nueva venta',
      desc: 'Abrir el punto de venta',
      icon: ShoppingCart,
      to: '/pos',
      roles: ['ADMIN', 'VENDEDOR'],
      chip: 'bg-brand-500 text-white',
      borderTop: 'border-t-brand-500',
      cardBg: 'bg-brand-50',
    },
    {
      label: cajaActual ? 'Ver caja' : 'Abrir caja',
      desc: cajaActual ? 'Caja abierta — revisa movimientos' : 'Registra el monto inicial del día',
      icon: Wallet,
      to: '/caja',
      roles: ['ADMIN', 'VENDEDOR'],
      chip: cajaActual ? 'bg-emerald-600 text-white' : 'bg-amber-warn text-white',
      borderTop: cajaActual ? 'border-t-emerald-600' : 'border-t-amber-warn',
    },
    {
      label: 'Registrar compra',
      desc: 'Ingreso de mercadería',
      icon: Truck,
      to: '/compras',
      roles: ['ADMIN'],
      chip: 'bg-red-danger text-white',
      borderTop: 'border-t-red-danger',
    },
    {
      label: 'Nuevo producto',
      desc: 'Agregar al inventario',
      icon: Package,
      to: '/inventario/nuevo',
      roles: ['ADMIN'],
      chip: 'bg-navy-900 text-white',
      borderTop: 'border-t-navy-900',
    },
  ].filter((a) => a.roles.includes(usuario?.rol ?? ''));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Hola, {usuario?.nombre?.split(' ')[0]}</h1>
        <p className="text-sm text-ink-500">Esto es lo que puedes hacer ahora en tu bazar.</p>
      </div>

      {!loading && stockBajo.length > 0 && (
        <Link
          to="/inventario?stockBajo=true"
          className="mb-6 flex items-center justify-between rounded-xl border border-amber-warn bg-amber-warn-bg px-6 py-4 text-sm font-medium text-amber-warn transition-opacity hover:opacity-90"
        >
          <span className="flex items-center gap-2.5">
            <AlertTriangle size={17} />
            {stockBajo.length} producto{stockBajo.length === 1 ? '' : 's'} con stock bajo — es buen momento para reponer
          </span>
          <ArrowRight size={16} />
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {acciones.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className={cn(
              'flex flex-col items-start gap-4 rounded-xl border border-t-4 border-ink-100 p-6 text-left transition-transform hover:-translate-y-0.5',
              a.borderTop,
              a.cardBg ?? 'bg-white',
            )}
          >
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', a.chip)}>
              <a.icon size={20} />
            </div>
            <div>
              <p className="font-display font-bold text-ink-900">{a.label}</p>
              <p className="text-xs text-ink-500">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt size={16} />
            Actividad reciente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-6 text-sm text-ink-500">Cargando…</p>
          ) : recientes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400">
                <Receipt size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-700">Aún no registras ventas</p>
                <p className="text-xs text-ink-500">Cuando vendas algo, aparecerá aquí.</p>
              </div>
              <button
                onClick={() => navigate('/pos')}
                className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
              >
                Registrar la primera venta
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {recientes.map((v) => (
                <li key={v.id} className="flex items-center justify-between px-6 py-4 text-sm">
                  <div className="min-w-0">
                    <p className={cn('truncate font-medium', v.anulada ? 'text-ink-400 line-through' : 'text-ink-900')}>
                      {v.detalles.map((d) => d.producto.nombre).join(', ')}
                    </p>
                    <p className="text-xs text-ink-500">
                      {v.usuario.nombre} · {formatDateTime(v.createdAt)}
                    </p>
                  </div>
                  <Badge variant={v.anulada ? 'neutral' : 'brand'}>{formatMoney(v.total)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
