import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BarRankingItem {
  label: string;
  value: number;
}

interface BarRankingChartProps {
  data: BarRankingItem[];
  valueFormatter?: (value: number) => string;
  tooltipLabel?: string;
  color?: string;
  height?: number;
}

export function BarRankingChart({
  data,
  valueFormatter = (v) => String(v),
  tooltipLabel = 'Valor',
  color = 'var(--color-brand-500)',
  height = 288,
}: BarRankingChartProps) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink-100)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-ink-500)' }} />
          <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 12, fill: 'var(--color-ink-700)' }} />
          <Tooltip
            formatter={(value: number) => [valueFormatter(value), tooltipLabel]}
            contentStyle={{ borderRadius: 8, borderColor: 'var(--color-ink-200)', fontSize: 13 }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
