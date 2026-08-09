import { formatMoney, formatDateTime } from './format';

export interface ComprobanteItem {
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface ComprobanteData {
  id: string;
  fecha: string;
  cajero: string;
  items: ComprobanteItem[];
  total: number;
  metodoPago: string;
  montoEfectivo?: number;
  vuelto?: number;
  anulada?: boolean;
}

function escapeHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** Abre una ventana con el comprobante interno (no fiscal) y dispara el diálogo de impresión —
 * desde ahí el usuario puede imprimir en térmica o "Guardar como PDF" (RF-V4). */
export function imprimirComprobante(v: ComprobanteData) {
  const ventana = window.open('', '_blank', 'width=380,height=600');
  if (!ventana) return;

  const filas = v.items
    .map(
      (i) => `
      <tr>
        <td colspan="2">${escapeHtml(i.nombre)}</td>
      </tr>
      <tr class="sub">
        <td>${i.cantidad} ${escapeHtml(i.unidad)} x ${formatMoney(i.precioUnitario)}</td>
        <td class="right">${formatMoney(i.subtotal)}</td>
      </tr>`,
    )
    .join('');

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Comprobante ${v.id.slice(0, 8)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; width: 300px; margin: 16px auto; color: #111; font-size: 13px; }
          h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
          .sub-header { text-align: center; font-size: 11px; color: #444; margin-bottom: 10px; }
          hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px 0; vertical-align: top; }
          tr.sub td { color: #444; font-size: 12px; }
          .right { text-align: right; }
          .total-row td { font-weight: bold; font-size: 14px; padding-top: 6px; }
          .anulada { text-align: center; font-weight: bold; color: #c0342b; border: 2px solid #c0342b; padding: 4px; margin: 8px 0; }
          .footer { text-align: center; font-size: 11px; color: #666; margin-top: 12px; }
          @media print {
            body { margin: 0 auto; }
          }
        </style>
      </head>
      <body>
        <h1>InventiQ</h1>
        <p class="sub-header">Comprobante interno — no válido como boleta/factura</p>
        <hr />
        <p>N°: ${v.id.slice(0, 8).toUpperCase()}<br />Fecha: ${escapeHtml(formatDateTime(v.fecha))}<br />Atendido por: ${escapeHtml(v.cajero)}</p>
        <hr />
        ${v.anulada ? '<p class="anulada">VENTA ANULADA</p>' : ''}
        <table>
          ${filas}
        </table>
        <hr />
        <table>
          <tr class="total-row">
            <td>TOTAL</td>
            <td class="right">${formatMoney(v.total)}</td>
          </tr>
        </table>
        <hr />
        <p>Método de pago: ${escapeHtml(v.metodoPago)}</p>
        ${
          v.montoEfectivo !== undefined && v.vuelto !== undefined && v.vuelto > 0
            ? `<p>Recibido: ${formatMoney(v.montoEfectivo)}<br />Vuelto: ${formatMoney(v.vuelto)}</p>`
            : ''
        }
        <p class="footer">Gracias por su compra</p>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  ventana.document.close();
}
