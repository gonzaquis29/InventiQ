import { useState, type FormEvent } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Producto } from '@/types';

export function AjustarStockModal({
  producto,
  onClose,
  onAjustado,
}: {
  producto: Producto | null;
  onClose: () => void;
  onAjustado: () => void;
}) {
  const { notify } = useToast();
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cerrar() {
    setCantidad('');
    setMotivo('');
    onClose();
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!producto) return;
    setGuardando(true);
    try {
      await api.post(`/productos/${producto.id}/ajustar-stock`, { cantidad: Number(cantidad), motivo });
      notify('Stock ajustado');
      cerrar();
      onAjustado();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo ajustar el stock'), 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open={!!producto} onClose={cerrar} title={`Ajustar stock — ${producto?.nombre ?? ''}`}>
      <form onSubmit={guardar} className="space-y-4">
        <p className="text-sm text-ink-500">
          Stock actual: {producto?.stock} {producto?.unidad}
        </p>
        <div>
          <Label htmlFor="cantidad">Cantidad a sumar o restar</Label>
          <Input
            id="cantidad"
            type="number"
            required
            autoFocus
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Ej: -3 (merma) o 10 (conteo)"
          />
        </div>
        <div>
          <Label htmlFor="motivo">Motivo *</Label>
          <Input id="motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: merma, conteo físico" />
        </div>
        <Button type="submit" className="w-full" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Confirmar ajuste'}
        </Button>
      </form>
    </Modal>
  );
}
