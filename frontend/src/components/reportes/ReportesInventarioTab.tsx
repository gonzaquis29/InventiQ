import { DollarSign, TrendingUp, Warehouse, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarRankingChart } from './BarRankingChart';
import type { ValorizacionInventario } from './types';

export function ReportesInventarioTab({ inventario }: { inventario: ValorizacionInventario | null }) {
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
              <Warehouse size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Valorizado (costo)</p>
              <p className="text-2xl font-semibold text-ink-900">{formatMoney(inventario?.valorCosto ?? 0)}</p>
              <p className="text-xs text-ink-500">{inventario?.totalProductos ?? 0} productos · {inventario?.totalUnidades ?? 0} unid.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Valorizado (venta)</p>
              <p className="text-2xl font-semibold text-ink-900">{formatMoney(inventario?.valorVenta ?? 0)}</p>
              <p className="text-xs text-ink-500">si se vende todo el stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-bg text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Ganancia potencial</p>
              <p className="text-2xl font-semibold text-emerald-600">{formatMoney(inventario?.gananciaPotencial ?? 0)}</p>
              <p className="text-xs text-ink-500">venta − costo</p>
            </div>
          </CardContent>
        </Card>
        <Card className={inventario && inventario.productosStockBajo > 0 ? 'border-amber-warn bg-amber-warn-bg' : undefined}>
          <CardContent className="flex items-center gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                inventario && inventario.productosStockBajo > 0 ? 'bg-white/60 text-amber-warn' : 'bg-ink-100 text-ink-700'
              }`}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <p
                className={`text-xs font-medium uppercase tracking-wide ${
                  inventario && inventario.productosStockBajo > 0 ? 'text-amber-warn' : 'text-ink-500'
                }`}
              >
                Stock bajo
              </p>
              <p className={`text-2xl font-semibold ${inventario && inventario.productosStockBajo > 0 ? 'text-amber-warn' : 'text-ink-900'}`}>
                {inventario?.productosStockBajo ?? 0}
              </p>
              <p className="text-xs text-ink-500">productos por reponer</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {inventario && inventario.topProductos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Productos con más capital invertido</CardTitle>
          </CardHeader>
          <CardContent>
            <BarRankingChart
              data={inventario.topProductos.map((p) => ({ label: p.nombre, value: p.valorCosto }))}
              valueFormatter={(v) => formatMoney(v)}
              tooltipLabel="Valorizado (costo)"
              color="var(--color-ink-700)"
              height={Math.max(inventario.topProductos.length * 40, 200)}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
