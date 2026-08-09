import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Lock, Unlock } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import type { CajaSesion } from '@/types';

export default function Caja() {
  const { notify } = useToast();
  const [cajaActual, setCajaActual] = useState<CajaSesion | null>(null);
  const [historial, setHistorial] = useState<CajaSesion[]>([]);
  const [loading, setLoading] = useState(true);

  const [montoApertura, setMontoApertura] = useState('');
  const [abriendo, setAbriendo] = useState(false);

  const [modalMovimiento, setModalMovimiento] = useState<'INGRESO' | 'RETIRO' | null>(null);
  const [montoMovimiento, setMontoMovimiento] = useState('');
  const [motivoMovimiento, setMotivoMovimiento] = useState('');

  const [modalCierre, setModalCierre] = useState(false);
  const [montoContado, setMontoContado] = useState('');
  const [cerrando, setCerrando] = useState(false);

  function cargar() {
    setLoading(true);
    Promise.all([api.get<CajaSesion | null>('/caja/actual'), api.get<CajaSesion[]>('/caja/historial')])
      .then(([actualRes, histRes]) => {
        setCajaActual(actualRes.data);
        setHistorial(histRes.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function abrirCaja(e: FormEvent) {
    e.preventDefault();
    setAbriendo(true);
    try {
      await api.post('/caja/abrir', { montoApertura: Number(montoApertura) });
      notify('Caja abierta');
      setMontoApertura('');
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo abrir la caja'), 'error');
    } finally {
      setAbriendo(false);
    }
  }

  async function registrarMovimiento(e: FormEvent) {
    e.preventDefault();
    if (!cajaActual || !modalMovimiento) return;
    try {
      await api.post(`/caja/${cajaActual.id}/movimiento`, {
        tipo: modalMovimiento,
        monto: Number(montoMovimiento),
        motivo: motivoMovimiento,
      });
      notify('Movimiento registrado');
      setModalMovimiento(null);
      setMontoMovimiento('');
      setMotivoMovimiento('');
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo registrar el movimiento'), 'error');
    }
  }

  async function cerrarCaja(e: FormEvent) {
    e.preventDefault();
    if (!cajaActual) return;
    setCerrando(true);
    try {
      await api.post(`/caja/${cajaActual.id}/cerrar`, { montoContado: Number(montoContado) });
      notify('Caja cerrada correctamente');
      setModalCierre(false);
      setMontoContado('');
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo cerrar la caja'), 'error');
    } finally {
      setCerrando(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-500">Cargando…</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Caja diaria</h1>

      {!cajaActual ? (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Abrir caja</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={abrirCaja} className="space-y-4">
              <div>
                <Label htmlFor="montoApertura">Monto inicial en efectivo (S/)</Label>
                <Input
                  id="montoApertura"
                  type="number"
                  min="0"
                  step="0.10"
                  required
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={abriendo}>
                <Unlock size={16} />
                {abriendo ? 'Abriendo…' : 'Abrir caja'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos de esta sesión</CardTitle>
              <Badge variant="brand">Abierta desde {formatDateTime(cajaActual.fechaApertura)}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-ink-100">
                <li className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-ink-600">Monto de apertura</span>
                  <span className="font-medium text-ink-900">{formatMoney(cajaActual.montoApertura)}</span>
                </li>
                {(cajaActual.movimientosCaja ?? []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      {m.tipo === 'RETIRO' ? (
                        <ArrowDownCircle size={16} className="text-red-danger" />
                      ) : (
                        <ArrowUpCircle size={16} className="text-brand-600" />
                      )}
                      <div>
                        <p className="text-ink-800">{m.motivo ?? m.tipo}</p>
                        <p className="text-xs text-ink-400">{formatDateTime(m.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`font-medium ${m.tipo === 'RETIRO' ? 'text-red-danger' : 'text-ink-900'}`}>
                      {m.tipo === 'RETIRO' ? '-' : '+'}
                      {formatMoney(m.monto)}
                    </span>
                  </li>
                ))}
                {(cajaActual.movimientosCaja ?? []).length === 0 && (
                  <li className="px-5 py-6 text-center text-sm text-ink-500">Aún no hay ventas ni movimientos.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => setModalMovimiento('INGRESO')}>
              <ArrowUpCircle size={16} />
              Registrar ingreso
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setModalMovimiento('RETIRO')}>
              <ArrowDownCircle size={16} />
              Registrar retiro
            </Button>
            <Button variant="danger" className="w-full" onClick={() => setModalCierre(true)}>
              <Lock size={16} />
              Cerrar caja (arqueo)
            </Button>
          </div>
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Historial de cierres</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3">Apertura</th>
                  <th className="px-5 py-3">Cierre</th>
                  <th className="px-5 py-3">Esperado</th>
                  <th className="px-5 py-3">Contado</th>
                  <th className="px-5 py-3">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {historial
                  .filter((s) => s.estado === 'CERRADA')
                  .map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3 text-ink-600">{formatDateTime(s.fechaApertura)}</td>
                      <td className="px-5 py-3 text-ink-600">{s.fechaCierre ? formatDateTime(s.fechaCierre) : '—'}</td>
                      <td className="px-5 py-3">{formatMoney(s.montoEsperado ?? 0)}</td>
                      <td className="px-5 py-3">{formatMoney(s.montoContado ?? 0)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={Number(s.diferencia) === 0 ? 'brand' : Number(s.diferencia) < 0 ? 'danger' : 'warn'}>
                          {formatMoney(s.diferencia ?? 0)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                {historial.filter((s) => s.estado === 'CERRADA').length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                      Aún no hay cierres de caja registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={!!modalMovimiento}
        onClose={() => setModalMovimiento(null)}
        title={modalMovimiento === 'RETIRO' ? 'Registrar retiro de efectivo' : 'Registrar ingreso de efectivo'}
      >
        <form onSubmit={registrarMovimiento} className="space-y-4">
          <div>
            <Label htmlFor="montoMovimiento">Monto (S/)</Label>
            <Input
              id="montoMovimiento"
              type="number"
              min="0.01"
              step="0.10"
              required
              value={montoMovimiento}
              onChange={(e) => setMontoMovimiento(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="motivoMovimiento">Motivo *</Label>
            <Input id="motivoMovimiento" required value={motivoMovimiento} onChange={(e) => setMotivoMovimiento(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">
            Confirmar
          </Button>
        </form>
      </Modal>

      <Modal open={modalCierre} onClose={() => setModalCierre(false)} title="Cerrar caja (arqueo)">
        <form onSubmit={cerrarCaja} className="space-y-4">
          <p className="text-sm text-ink-500">Cuenta el efectivo físico en tu caja e ingresa el monto total.</p>
          <div>
            <Label htmlFor="montoContado">Monto contado (S/)</Label>
            <Input
              id="montoContado"
              type="number"
              min="0"
              step="0.10"
              required
              value={montoContado}
              onChange={(e) => setMontoContado(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" variant="danger" className="w-full" disabled={cerrando}>
            {cerrando ? 'Cerrando…' : 'Confirmar cierre'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
