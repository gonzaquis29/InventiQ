import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Banknote, CheckCircle2, CreditCard, MinusCircle, Receipt, Scale, Smartphone, Trash2, TriangleAlert, Users, Wallet } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { InfoTip } from '@/components/ui/InfoTip';
import type { CuadreCaja, ResumenCajaDia } from '@/types';

const MOTIVOS_FRECUENTES = ['Delivery', 'Pasajes', 'Pago a proveedor', 'Almuerzo', 'Limpieza'];

function hoyLima() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

function fechaLarga(fecha: string) {
  const texto = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' }).format(
    new Date(`${fecha}T12:00:00-05:00`),
  );
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function hora(iso: string) {
  return new Intl.DateTimeFormat('es-PE', { timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(iso));
}

/** Traduce la diferencia de un cuadre a algo que se entienda de un vistazo. */
function estadoCuadre(diferencia: number) {
  if (Math.abs(diferencia) < 0.005) return { label: 'Cuadra', tono: 'ok' as const };
  if (diferencia < 0) return { label: `Faltan ${formatMoney(-diferencia)}`, tono: 'falta' as const };
  return { label: `Sobran ${formatMoney(diferencia)}`, tono: 'sobra' as const };
}

const TONO_CLASES = {
  ok: 'bg-emerald-bg text-emerald-600',
  falta: 'bg-red-danger-bg text-red-danger',
  sobra: 'bg-amber-warn-bg text-amber-warn',
};

export default function Caja() {
  const { usuario } = useAuth();
  const { notify } = useToast();
  const esAdmin = usuario?.rol === 'ADMIN';

  const [fecha, setFecha] = useState(hoyLima());
  const [resumen, setResumen] = useState<ResumenCajaDia | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalGasto, setModalGasto] = useState(false);
  const [montoGasto, setMontoGasto] = useState('');
  const [motivoGasto, setMotivoGasto] = useState('');
  const [guardandoGasto, setGuardandoGasto] = useState(false);

  const [modalCuadre, setModalCuadre] = useState(false);
  const [montoContado, setMontoContado] = useState('');
  const [notaCuadre, setNotaCuadre] = useState('');
  const [guardandoCuadre, setGuardandoCuadre] = useState(false);
  const [resultadoCuadre, setResultadoCuadre] = useState<CuadreCaja | null>(null);

  const cargar = useCallback(() => {
    return api
      .get<ResumenCajaDia>('/caja/dia', { params: { fecha } })
      .then((res) => setResumen(res.data))
      .catch((err) => notify(apiErrorMessage(err, 'No se pudo cargar la caja del día'), 'error'))
      .finally(() => setLoading(false));
  }, [fecha, notify]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function registrarGasto(e: FormEvent) {
    e.preventDefault();
    setGuardandoGasto(true);
    try {
      await api.post('/caja/gastos', { monto: Number(montoGasto), motivo: motivoGasto });
      notify('Gasto registrado');
      setModalGasto(false);
      setMontoGasto('');
      setMotivoGasto('');
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo registrar el gasto'), 'error');
    } finally {
      setGuardandoGasto(false);
    }
  }

  async function eliminarGasto(id: string) {
    if (!confirm('¿Eliminar este gasto? El efectivo esperado se recalcula.')) return;
    try {
      await api.delete(`/caja/gastos/${id}`);
      notify('Gasto eliminado');
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo eliminar el gasto'), 'error');
    }
  }

  async function cuadrar(e: FormEvent) {
    e.preventDefault();
    setGuardandoCuadre(true);
    try {
      const res = await api.post<CuadreCaja>('/caja/cuadres', { montoContado: Number(montoContado), nota: notaCuadre || undefined });
      setResultadoCuadre(res.data);
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo guardar el cuadre'), 'error');
    } finally {
      setGuardandoCuadre(false);
    }
  }

  function cerrarModalCuadre() {
    setModalCuadre(false);
    setResultadoCuadre(null);
    setMontoContado('');
    setNotaCuadre('');
  }

  const esHoy = resumen?.esHoy ?? fecha === hoyLima();
  const ultimoCuadre = resumen?.cuadres[0];

  return (
    <div>
      <PageHeader
        title="Caja del día"
        description={fechaLarga(fecha)}
        ayuda="caja"
        actions={
          <>
            {esAdmin && (
              <div>
                <Label htmlFor="fechaCaja">Ver otro día</Label>
                <Input id="fechaCaja" type="date" value={fecha} max={hoyLima()} onChange={(e) => e.target.value && setFecha(e.target.value)} />
              </div>
            )}
            {esHoy ? (
              <>
                <Button variant="outline" onClick={() => setModalGasto(true)}>
                  <MinusCircle size={16} />
                  Registrar gasto
                </Button>
                <Button onClick={() => setModalCuadre(true)}>
                  <Scale size={16} />
                  Cuadrar efectivo
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setFecha(hoyLima())}>
                Volver a hoy
              </Button>
            )}
          </>
        }
      />

      {loading || !resumen ? (
        <p className="text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <EfectivoEsperadoCard resumen={resumen} ultimoCuadre={ultimoCuadre} />
            <VendidoCard resumen={resumen} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt size={16} />
                  Gastos del día
                </CardTitle>
                <span className="text-sm font-semibold text-ink-900">{formatMoney(resumen.totalGastos)}</span>
              </CardHeader>
              <CardContent className="p-0">
                {resumen.gastos.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-ink-500">
                    Sin gastos. Si pagas algo con el efectivo de las ventas, regístralo aquí para que el cuadre salga bien.
                  </p>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {resumen.gastos.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-3 px-6 py-4 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-800">{g.motivo}</p>
                          <p className="text-xs text-ink-400">
                            {hora(g.createdAt)} · {g.usuario}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-red-danger">−{formatMoney(g.monto)}</span>
                          {(esAdmin || g.usuarioId === usuario?.id) && (
                            <button
                              onClick={() => eliminarGasto(g.id)}
                              className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-red-danger-bg hover:text-red-danger"
                              aria-label="Eliminar gasto"
                              title="Eliminar gasto"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale size={16} />
                  Cuadres del día
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {resumen.cuadres.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-ink-500">
                    Todavía no se cuadró el efectivo. Es opcional: hazlo cuando quieras comprobar que el dinero está completo.
                  </p>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {resumen.cuadres.map((c) => {
                      const estado = estadoCuadre(c.diferencia);
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-3 px-6 py-4 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium text-ink-800">
                              Contado {formatMoney(c.montoContado)} <span className="font-normal text-ink-400">de {formatMoney(c.montoEsperado)}</span>
                            </p>
                            <p className="truncate text-xs text-ink-400">
                              {hora(c.createdAt)} · {c.usuario}
                              {c.nota ? ` · ${c.nota}` : ''}
                            </p>
                          </div>
                          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', TONO_CLASES[estado.tono])}>{estado.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {resumen.porVendedor.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={16} />
                  Ventas por vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-ink-100">
                  {resumen.porVendedor.map((v) => (
                    <li key={v.nombre} className="flex items-center justify-between px-6 py-4 text-sm">
                      <span className="font-medium text-ink-800">{v.nombre}</span>
                      <span className="text-ink-500">
                        {v.cantidad} venta{v.cantidad === 1 ? '' : 's'} · <span className="font-semibold text-ink-900">{formatMoney(v.total)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Modal open={modalGasto} onClose={() => setModalGasto(false)} title="Registrar gasto">
        <form onSubmit={registrarGasto} className="space-y-4">
          <p className="text-sm text-ink-500">Dinero que sacaste del efectivo de las ventas. Se descuenta del efectivo esperado.</p>
          <div>
            <Label htmlFor="montoGasto">Monto (S/)</Label>
            <Input
              id="montoGasto"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={montoGasto}
              onChange={(e) => setMontoGasto(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="motivoGasto">¿En qué se gastó?</Label>
            <Input
              id="motivoGasto"
              required
              minLength={3}
              maxLength={120}
              placeholder="Ej. Delivery de mercadería"
              value={motivoGasto}
              onChange={(e) => setMotivoGasto(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MOTIVOS_FRECUENTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivoGasto(m)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    motivoGasto === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={guardandoGasto}>
            {guardandoGasto ? 'Guardando…' : 'Registrar gasto'}
          </Button>
        </form>
      </Modal>

      <Modal open={modalCuadre} onClose={cerrarModalCuadre} title="Cuadrar efectivo">
        {resultadoCuadre ? (
          <ResultadoCuadre cuadre={resultadoCuadre} onListo={cerrarModalCuadre} />
        ) : (
          <form onSubmit={cuadrar} className="space-y-4">
            <ol className="space-y-1.5 text-sm text-ink-600">
              <li>1. Junta todo el efectivo de las ventas de hoy (billetes y monedas).</li>
              <li>2. Cuéntalo y escribe el total abajo.</li>
              <li>3. El sistema te dirá si cuadra, falta o sobra.</li>
            </ol>
            <div>
              <Label htmlFor="montoContado">Efectivo contado (S/)</Label>
              <Input
                id="montoContado"
                type="number"
                min="0"
                step="0.01"
                required
                value={montoContado}
                onChange={(e) => setMontoContado(e.target.value)}
                className="h-12 text-lg"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="notaCuadre">Nota (opcional)</Label>
              <Input id="notaCuadre" maxLength={200} placeholder="Ej. Cuadre de la tarde" value={notaCuadre} onChange={(e) => setNotaCuadre(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={guardandoCuadre}>
              {guardandoCuadre ? 'Comparando…' : 'Comparar con el sistema'}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}

function EfectivoEsperadoCard({ resumen, ultimoCuadre }: { resumen: ResumenCajaDia; ultimoCuadre?: CuadreCaja }) {
  const estado = ultimoCuadre ? estadoCuadre(ultimoCuadre.diferencia) : null;
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-navy-900 p-6 text-white">
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-ink-300">
          <Wallet size={16} className="text-brand-500" />
          Efectivo esperado
          <InfoTip>Lo que debería haber en efectivo: lo vendido en efectivo hoy menos los gastos. Las ventas anuladas no cuentan.</InfoTip>
        </div>
        <p className="font-display text-4xl font-bold tracking-tight">{formatMoney(resumen.efectivoEsperado)}</p>
        <p className="mt-2 text-sm text-ink-400">
          {formatMoney(resumen.ventas.efectivo)} en ventas − {formatMoney(resumen.totalGastos)} en gastos
        </p>
      </div>
      <div className="mt-6 border-t border-white/10 pt-4 text-sm">
        {ultimoCuadre && estado ? (
          <p className="flex items-center gap-2">
            {estado.tono === 'ok' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <TriangleAlert size={16} className="text-amber-400" />}
            <span>
              Último cuadre ({hora(ultimoCuadre.createdAt)}): <span className="font-semibold">{estado.label}</span>
            </span>
          </p>
        ) : (
          <p className="text-ink-400">Aún no se ha cuadrado el efectivo hoy.</p>
        )}
      </div>
    </div>
  );
}

function VendidoCard({ resumen }: { resumen: ResumenCajaDia }) {
  const { ventas } = resumen;
  const metodos = [
    { label: 'Efectivo', monto: ventas.efectivo, icon: Banknote, color: 'bg-emerald-600' },
    { label: 'Tarjeta', monto: ventas.tarjeta, icon: CreditCard, color: 'bg-navy-900' },
    { label: 'Yape / Plin', monto: ventas.yapePlin, icon: Smartphone, color: 'bg-brand-500' },
    ...(ventas.digitalMixto > 0 ? [{ label: 'Digital (pago mixto)', monto: ventas.digitalMixto, icon: Smartphone, color: 'bg-brand-300' }] : []),
  ];

  return (
    <Card>
      <CardContent>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Vendido</p>
            <p className="font-display text-3xl font-bold text-ink-900">{formatMoney(ventas.total)}</p>
          </div>
          <div className="text-right text-sm text-ink-500">
            <p>
              <span className="font-semibold text-ink-900">{ventas.cantidad}</span> venta{ventas.cantidad === 1 ? '' : 's'}
            </p>
            {ventas.anuladas > 0 && (
              <p className="text-xs">
                {ventas.anuladas} anulada{ventas.anuladas === 1 ? '' : 's'} (no cuentan)
              </p>
            )}
          </div>
        </div>

        {ventas.cantidad === 0 ? (
          <p className="text-sm text-ink-500">Todavía no hay ventas. Cuando vendas en el punto de venta, aparecerán aquí al instante.</p>
        ) : (
          <ul className="space-y-3.5">
            {metodos.map((m) => {
              const porcentaje = ventas.total > 0 ? (m.monto / ventas.total) * 100 : 0;
              return (
                <li key={m.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-ink-700">
                      <m.icon size={15} className="text-ink-400" />
                      {m.label}
                    </span>
                    <span className="font-medium text-ink-900">{formatMoney(m.monto)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className={cn('h-full rounded-full', m.color)} style={{ width: `${porcentaje}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ResultadoCuadre({ cuadre, onListo }: { cuadre: CuadreCaja; onListo: () => void }) {
  const estado = estadoCuadre(cuadre.diferencia);
  const mensaje = {
    ok: 'El efectivo está completo. ¡Todo en orden!',
    falta: 'Hay menos efectivo del esperado. Revisa si falta registrar un gasto o si se dio mal un vuelto.',
    sobra: 'Hay más efectivo del esperado. Puede que una venta no se haya registrado en el sistema.',
  }[estado.tono];

  return (
    <div className="space-y-5 text-center">
      <div className={cn('rounded-2xl px-6 py-6', TONO_CLASES[estado.tono])}>
        {estado.tono === 'ok' ? <CheckCircle2 size={36} className="mx-auto mb-2" /> : <TriangleAlert size={36} className="mx-auto mb-2" />}
        <p className="font-display text-2xl font-bold">{estado.label}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-ink-50 px-4 py-3">
          <p className="text-ink-500">Esperado</p>
          <p className="font-semibold text-ink-900">{formatMoney(cuadre.montoEsperado)}</p>
        </div>
        <div className="rounded-xl bg-ink-50 px-4 py-3">
          <p className="text-ink-500">Contado</p>
          <p className="font-semibold text-ink-900">{formatMoney(cuadre.montoContado)}</p>
        </div>
      </div>
      <p className="text-sm text-ink-600">{mensaje}</p>
      <Button className="w-full" onClick={onListo}>
        Listo
      </Button>
    </div>
  );
}
