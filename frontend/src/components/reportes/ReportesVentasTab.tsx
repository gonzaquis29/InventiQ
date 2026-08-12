import { DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarRankingChart } from './BarRankingChart';
import { TendenciaVentasChart } from './TendenciaVentasChart';
import { MetodoPagoChart } from './MetodoPagoChart';
import type { Ganancias, ProductoVendido, ResumenVentas } from './types';

interface ReportesVentasTabProps {
  resumen: ResumenVentas | null;
  masVendidos: ProductoVendido[];
  ganancias: Ganancias | null;
}

export function ReportesVentasTab({ resumen, masVendidos, ganancias }: ReportesVentasTabProps) {
  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Total vendido</p>
              <p className="text-2xl font-semibold text-ink-900">{formatMoney(resumen?.totalVentas ?? 0)}</p>
              <p className="text-xs text-ink-500">{resumen?.cantidadVentas ?? 0} ventas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-bg text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Ganancia estimada</p>
              <p className="text-2xl font-semibold text-emerald-600">{formatMoney(ganancias?.ganancia ?? 0)}</p>
              <p className="text-xs text-ink-500">Costo: {formatMoney(ganancias?.costos ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
              <CreditCard size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-500">Por método de pago</p>
              <MetodoPagoChart data={resumen?.porMetodoPago ?? {}} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tendencia de ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {!resumen || resumen.porDia.every((d) => d.total === 0) ? (
            <p className="text-sm text-ink-500">Sin ventas en el período seleccionado.</p>
          ) : (
            <TendenciaVentasChart data={resumen.porDia} />
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Productos más vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          {masVendidos.length === 0 ? (
            <p className="text-sm text-ink-500">Sin datos en el período seleccionado.</p>
          ) : (
            <BarRankingChart
              data={masVendidos.map((p) => ({ label: p.nombre, value: p.cantidad }))}
              valueFormatter={(v) => `${v} unid.`}
              tooltipLabel="Cantidad vendida"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={16} />
            Ventas por vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!resumen || resumen.porVendedor.length === 0 ? (
            <p className="text-sm text-ink-500">Sin datos en el período seleccionado.</p>
          ) : (
            <BarRankingChart
              data={[...resumen.porVendedor].sort((a, b) => b.total - a.total).map((v) => ({ label: v.nombre, value: v.total }))}
              valueFormatter={(v) => formatMoney(v)}
              tooltipLabel="Vendido"
              color="var(--color-ink-700)"
              height={Math.max(resumen.porVendedor.length * 48, 120)}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
