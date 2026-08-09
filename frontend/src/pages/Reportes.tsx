import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface ResumenVentas {
  cantidadVentas: number;
  totalVentas: number;
  porMetodoPago: Record<string, number>;
  porVendedor: { nombre: string; total: number; cantidad: number }[];
}

interface ProductoVendido {
  nombre: string;
  cantidad: number;
  total: number;
}

interface Ganancias {
  ingresos: number;
  costos: number;
  ganancia: number;
}

interface CierreCaja {
  id: string;
  usuario: string;
  fechaCierre: string;
  montoEsperado: number;
  montoContado: number;
  diferencia: number;
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE_PLIN: 'Yape / Plin',
  MIXTO: 'Mixto',
};

function hace30Dias() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function Reportes() {
  const [desde, setDesde] = useState(hace30Dias());
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));

  const [resumen, setResumen] = useState<ResumenVentas | null>(null);
  const [masVendidos, setMasVendidos] = useState<ProductoVendido[]>([]);
  const [ganancias, setGanancias] = useState<Ganancias | null>(null);
  const [cierres, setCierres] = useState<CierreCaja[]>([]);

  useEffect(() => {
    const params = { desde: new Date(desde).toISOString(), hasta: new Date(`${hasta}T23:59:59`).toISOString() };
    api.get<ResumenVentas>('/reportes/ventas', { params }).then((res) => setResumen(res.data));
    api.get<ProductoVendido[]>('/reportes/productos-mas-vendidos', { params }).then((res) => setMasVendidos(res.data));
    api.get<Ganancias>('/reportes/ganancias', { params }).then((res) => setGanancias(res.data));
    api.get<CierreCaja[]>('/reportes/caja', { params }).then((res) => setCierres(res.data));
  }, [desde, hasta]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink-900">Reportes</h1>
        <div className="flex items-end gap-3">
          <div>
            <Label htmlFor="desde">Desde</Label>
            <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="hasta">Hasta</Label>
            <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
      </div>

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
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-500">Por método de pago</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(resumen?.porMetodoPago ?? {}).map(([metodo, monto]) => (
                  <Badge key={metodo} variant="neutral">
                    {METODO_LABEL[metodo] ?? metodo}: {formatMoney(monto)}
                  </Badge>
                ))}
                {!resumen?.porMetodoPago || Object.keys(resumen.porMetodoPago).length === 0 ? (
                  <span className="text-sm text-ink-400">Sin ventas en el período</span>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Productos más vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          {masVendidos.length === 0 ? (
            <p className="text-sm text-ink-500">Sin datos en el período seleccionado.</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={masVendidos} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink-100)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-ink-500)' }} />
                  <YAxis type="category" dataKey="nombre" width={160} tick={{ fontSize: 12, fill: 'var(--color-ink-700)' }} />
                  <Tooltip
                    formatter={(value) => [`${value} unid.`, 'Cantidad vendida']}
                    contentStyle={{ borderRadius: 8, borderColor: 'var(--color-ink-200)', fontSize: 13 }}
                  />
                  <Bar dataKey="cantidad" fill="var(--color-brand-500)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={16} />
            Ventas por vendedor
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!resumen || resumen.porVendedor.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">Sin datos en el período seleccionado.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {[...resumen.porVendedor]
                .sort((a, b) => b.total - a.total)
                .map((v) => (
                  <li key={v.nombre} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium text-ink-900">{v.nombre}</p>
                      <p className="text-xs text-ink-500">{v.cantidad} ventas</p>
                    </div>
                    <span className="font-display font-bold text-ink-900">{formatMoney(v.total)}</span>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cierres de caja</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3">Fecha de cierre</th>
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-5 py-3">Esperado</th>
                  <th className="px-5 py-3">Contado</th>
                  <th className="px-5 py-3">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {cierres.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3 text-ink-600">{new Date(c.fechaCierre).toLocaleString('es-PE')}</td>
                    <td className="px-5 py-3 text-ink-600">{c.usuario}</td>
                    <td className="px-5 py-3">{formatMoney(c.montoEsperado)}</td>
                    <td className="px-5 py-3">{formatMoney(c.montoContado)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={c.diferencia === 0 ? 'brand' : c.diferencia < 0 ? 'danger' : 'warn'}>
                        {formatMoney(c.diferencia)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {cierres.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                      Sin cierres de caja en el período.
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
