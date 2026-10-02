import { useEffect, useState } from 'react';
import { Download, ShoppingCart, Warehouse, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { Input, Label } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { exportarReporteCaja, exportarReporteInventario, exportarReporteVentas } from '@/lib/exportReportes';
import { ReportesVentasTab } from '@/components/reportes/ReportesVentasTab';
import { ReportesInventarioTab } from '@/components/reportes/ReportesInventarioTab';
import { ReportesCajaTab } from '@/components/reportes/ReportesCajaTab';
import type { CuadreCajaReporte, Ganancias, ProductoVendido, ResumenVentas, ValorizacionInventario } from '@/components/reportes/types';
import { PageHeader } from '@/components/ui/PageHeader';

const TABS = [
  { key: 'ventas', label: 'Ventas', icon: ShoppingCart, conFecha: true },
  { key: 'inventario', label: 'Inventario', icon: Warehouse, conFecha: false },
  { key: 'caja', label: 'Caja', icon: Wallet, conFecha: true },
] as const;

function hace30Dias() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function Reportes() {
  const [activa, setActiva] = useState<(typeof TABS)[number]['key']>('ventas');
  const tab = TABS.find((t) => t.key === activa) ?? TABS[0];

  const [desde, setDesde] = useState(hace30Dias());
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));

  const [resumen, setResumen] = useState<ResumenVentas | null>(null);
  const [masVendidos, setMasVendidos] = useState<ProductoVendido[]>([]);
  const [ganancias, setGanancias] = useState<Ganancias | null>(null);
  const [cierres, setCierres] = useState<CuadreCajaReporte[]>([]);
  const [inventario, setInventario] = useState<ValorizacionInventario | null>(null);

  useEffect(() => {
    const params = { desde: new Date(desde).toISOString(), hasta: new Date(`${hasta}T23:59:59`).toISOString() };
    api.get<ResumenVentas>('/reportes/ventas', { params }).then((res) => setResumen(res.data));
    api.get<ProductoVendido[]>('/reportes/productos-mas-vendidos', { params }).then((res) => setMasVendidos(res.data));
    api.get<Ganancias>('/reportes/ganancias', { params }).then((res) => setGanancias(res.data));
    api.get<CuadreCajaReporte[]>('/reportes/caja', { params }).then((res) => setCierres(res.data));
  }, [desde, hasta]);

  useEffect(() => {
    // Foto del inventario actual — no depende del rango de fechas.
    api.get<ValorizacionInventario>('/reportes/inventario').then((res) => setInventario(res.data));
  }, []);

  const exportar = () => {
    if (activa === 'ventas' && resumen) exportarReporteVentas(desde, hasta, resumen, masVendidos, ganancias);
    if (activa === 'inventario' && inventario) exportarReporteInventario(inventario);
    if (activa === 'caja') exportarReporteCaja(desde, hasta, cierres);
  };

  return (
    <div>
      <PageHeader
        title="Reportes"
        ayuda="reportes"
        actions={
          <>
            {tab.conFecha && (
              <>
                <div>
                  <Label htmlFor="desde">Desde</Label>
                  <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="hasta">Hasta</Label>
                  <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                </div>
              </>
            )}
            <Button variant="outline" onClick={exportar}>
              <Download size={16} />
              Exportar CSV
            </Button>
          </>
        }
      />
      <div className="mb-6 flex gap-1 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiva(t.key)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activa === t.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800',
            )}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {activa === 'ventas' && <ReportesVentasTab resumen={resumen} masVendidos={masVendidos} ganancias={ganancias} />}
      {activa === 'inventario' && <ReportesInventarioTab inventario={inventario} />}
      {activa === 'caja' && <ReportesCajaTab cierres={cierres} />}
    </div>
  );
}
