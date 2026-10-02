import { ClipboardList, Scale } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CuadreCajaReporte } from './types';

export function ReportesCajaTab({ cierres }: { cierres: CuadreCajaReporte[] }) {
  const sumaDiferencias = cierres.reduce((acc, c) => acc + c.diferencia, 0);

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
              <ClipboardList size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Cuadres en el período</p>
              <p className="text-2xl font-semibold text-ink-900">{cierres.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={sumaDiferencias !== 0 ? 'border-amber-warn bg-amber-warn-bg' : undefined}>
          <CardContent className="flex items-center gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                sumaDiferencias !== 0 ? 'bg-white/60 text-amber-warn' : 'bg-ink-100 text-ink-700'
              }`}
            >
              <Scale size={20} />
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${sumaDiferencias !== 0 ? 'text-amber-warn' : 'text-ink-500'}`}>
                Diferencia acumulada
              </p>
              <p className={`text-2xl font-semibold ${sumaDiferencias !== 0 ? 'text-amber-warn' : 'text-ink-900'}`}>
                {formatMoney(sumaDiferencias)}
              </p>
              <p className="text-xs text-ink-500">contado − esperado (negativo = faltó)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuadres de efectivo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Gastos</th>
                  <th className="px-6 py-4">Esperado</th>
                  <th className="px-6 py-4">Contado</th>
                  <th className="px-6 py-4">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {cierres.map((c) => (
                  <tr key={c.id}>
                    <td className="px-6 py-4 text-ink-600">{new Date(c.fecha).toLocaleString('es-PE')}</td>
                    <td className="px-6 py-4 text-ink-600">{c.usuario}</td>
                    <td className="px-6 py-4 text-ink-600">{formatMoney(c.gastos)}</td>
                    <td className="px-6 py-4">{formatMoney(c.montoEsperado)}</td>
                    <td className="px-6 py-4">{formatMoney(c.montoContado)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={c.diferencia === 0 ? 'brand' : c.diferencia < 0 ? 'danger' : 'warn'}>
                        {formatMoney(c.diferencia)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {cierres.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-ink-500">
                      Sin cuadres de efectivo en el período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
