import { useState, type FormEvent } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

export function AnularVentaModal({ ventaId, onClose, onAnulada }: { ventaId: string | null; onClose: () => void; onAnulada: () => void }) {
  const { notify } = useToast();
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  function cerrar() {
    setMotivo('');
    onClose();
  }

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    if (!ventaId) return;
    setProcesando(true);
    try {
      await api.post(`/ventas/${ventaId}/anular`, { motivo });
      notify('Venta anulada y stock repuesto');
      cerrar();
      onAnulada();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo anular la venta'), 'error');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <Modal open={!!ventaId} onClose={cerrar} title="Anular venta">
      <form onSubmit={confirmar} className="space-y-4">
        <p className="text-sm text-ink-500">
          Se repondrá el stock de los productos vendidos y quedará un registro permanente de esta anulación. Esta acción no se puede deshacer.
        </p>
        <div>
          <Label htmlFor="motivo">Motivo de la anulación *</Label>
          <Input id="motivo" required autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: error de cobro, producto equivocado" />
        </div>
        <Button type="submit" variant="danger" className="w-full" disabled={procesando}>
          {procesando ? 'Anulando…' : 'Confirmar anulación'}
        </Button>
      </form>
    </Modal>
  );
}
