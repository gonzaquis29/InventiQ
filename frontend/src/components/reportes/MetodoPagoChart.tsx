import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney } from '@/lib/format';

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE_PLIN: 'Yape / Plin',
  MIXTO: 'Mixto',
};

const COLORES = ['var(--color-brand-500)', 'var(--color-ink-700)', 'var(--color-emerald-600)', 'var(--color-amber-warn)'];

export function MetodoPagoChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).map(([metodo, monto]) => ({ name: METODO_LABEL[metodo] ?? metodo, value: monto }));

  if (entries.length === 0) {
    return <p className="text-sm text-ink-400">Sin ventas en el período</p>;
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={entries} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
            {entries.map((_, i) => (
              <Cell key={i} fill={COLORES[i % COLORES.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatMoney(value)}
            contentStyle={{ borderRadius: 8, borderColor: 'var(--color-ink-200)', fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
