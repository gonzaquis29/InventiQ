import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '@/lib/format';

interface PuntoVentaDia {
  fecha: string;
  total: number;
}

function formatFechaCorta(fecha: string): string {
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes}`;
}

export function TendenciaVentasChart({ data }: { data: PuntoVentaDia[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="tendenciaVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink-100)" vertical={false} />
          <XAxis dataKey="fecha" tickFormatter={formatFechaCorta} tick={{ fontSize: 12, fill: 'var(--color-ink-500)' }} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--color-ink-500)' }} width={56} tickFormatter={(v: number) => formatMoney(v)} />
          <Tooltip
            labelFormatter={(label) => formatFechaCorta(String(label))}
            formatter={(value) => [formatMoney(Number(value)), 'Vendido']}
            contentStyle={{ borderRadius: 8, borderColor: 'var(--color-ink-200)', fontSize: 13 }}
          />
          <Area type="monotone" dataKey="total" stroke="var(--color-brand-500)" fill="url(#tendenciaVentas)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
