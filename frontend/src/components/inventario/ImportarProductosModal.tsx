import { useRef, useState } from 'react';
import { UploadCloud, Download, CheckCircle2, XCircle } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { parseCsv, mapearColumnas, CAMPOS_PLANTILLA_IMPORTACION } from '@/lib/csv';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface FilaImportacion {
  fila: number;
  nombre: string;
  marca?: string;
  categoria?: string;
  codigoBarras?: string;
  precioCompra?: number;
  precioVenta?: number;
  unidad?: string;
  unidadCompra?: string;
  factorCompra?: number;
  stock?: number;
  stockMinimo?: number;
  errores: string[];
}

interface ResultadoImportacion {
  totalCreados: number;
  totalOmitidos: number;
  omitidos: { fila: number; nombre: string; motivo: string }[];
}

function numeroOpcional(valor: string | undefined): number | undefined {
  if (!valor) return undefined;
  const n = Number(valor.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function procesarFilas(rows: string[][]): FilaImportacion[] {
  if (rows.length === 0) return [];
  const columnas = mapearColumnas(rows[0]);
  const get = (row: string[], campo: keyof typeof columnas) => {
    const idx = columnas[campo];
    return idx === undefined ? undefined : row[idx];
  };

  return rows.slice(1).map((row, i) => {
    const errores: string[] = [];
    const nombre = get(row, 'nombre') ?? '';
    const precioVenta = numeroOpcional(get(row, 'precioVenta'));
    const precioCompra = numeroOpcional(get(row, 'precioCompra'));
    const factorCompra = numeroOpcional(get(row, 'factorCompra'));
    const stock = numeroOpcional(get(row, 'stock'));
    const stockMinimo = numeroOpcional(get(row, 'stockMinimo'));

    if (!nombre.trim()) errores.push('Falta el nombre');
    if (precioVenta === undefined || precioVenta < 0) errores.push('Precio de venta inválido o faltante');

    return {
      fila: i + 1,
      nombre: nombre.trim(),
      marca: get(row, 'marca')?.trim() || undefined,
      categoria: get(row, 'categoria')?.trim() || undefined,
      codigoBarras: get(row, 'codigoBarras')?.trim() || undefined,
      precioCompra,
      precioVenta,
      unidad: get(row, 'unidad')?.trim() || undefined,
      unidadCompra: get(row, 'unidadCompra')?.trim() || undefined,
      factorCompra: factorCompra && factorCompra >= 1 ? Math.round(factorCompra) : undefined,
      stock: stock && stock >= 0 ? Math.round(stock) : undefined,
      stockMinimo: stockMinimo && stockMinimo >= 0 ? Math.round(stockMinimo) : undefined,
      errores,
    };
  });
}

function descargarPlantilla() {
  const encabezado = CAMPOS_PLANTILLA_IMPORTACION.join(',');
  // codigoBarras vacío a propósito: es opcional, no inventes uno si el producto no tiene.
  const ejemplo = 'Papel Bond A4 (paquete x100),Report,Utiles,,18,25,paquete,millar,1000,12,3';
  const contenido = `${encabezado}\n${ejemplo}\n`;
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-productos-inventiq.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportarProductosModal({ open, onClose, onImportado }: { open: boolean; onClose: () => void; onImportado: () => void }) {
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filas, setFilas] = useState<FilaImportacion[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

  const validas = filas.filter((f) => f.errores.length === 0);
  const invalidas = filas.filter((f) => f.errores.length > 0);

  function reiniciar() {
    setFilas([]);
    setNombreArchivo('');
    setResultado(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function cerrar() {
    reiniciar();
    onClose();
  }

  function onArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setResultado(null);
    setNombreArchivo(archivo.name);
    const reader = new FileReader();
    reader.onload = () => {
      const texto = String(reader.result ?? '');
      const rows = parseCsv(texto);
      setFilas(procesarFilas(rows));
    };
    reader.readAsText(archivo, 'utf-8');
  }

  async function confirmarImportacion() {
    if (validas.length === 0) return;
    setImportando(true);
    try {
      const { data } = await api.post<ResultadoImportacion>('/productos/importar', {
        productos: validas.map((f) => ({
          nombre: f.nombre,
          marca: f.marca,
          categoria: f.categoria,
          codigoBarras: f.codigoBarras,
          precioCompra: f.precioCompra,
          precioVenta: f.precioVenta,
          unidad: f.unidad,
          unidadCompra: f.unidadCompra,
          factorCompra: f.factorCompra,
          stock: f.stock,
          stockMinimo: f.stockMinimo,
        })),
      });
      setResultado(data);
      notify(`${data.totalCreados} productos importados`);
      onImportado();
    } catch (err) {
      notify(apiErrorMessage(err, 'No se pudo completar la importación'), 'error');
    } finally {
      setImportando(false);
    }
  }

  return (
    <Modal open={open} onClose={cerrar} title="Importar productos desde CSV" widthClass="max-w-3xl">
      <div className="space-y-4">
        {!nombreArchivo && (
          <>
            <p className="text-sm text-ink-500">
              Sube un archivo CSV con tu inventario. Si tu lista está en Excel, usa "Guardar como → CSV" antes de subirla.
            </p>
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-ink-200 px-6 py-10 text-center">
              <UploadCloud size={28} className="text-ink-400" />
              <div>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Elegir archivo CSV
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onArchivoSeleccionado} />
              </div>
              <button type="button" onClick={descargarPlantilla} className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline">
                <Download size={13} />
                Descargar plantilla de ejemplo
              </button>
            </div>
          </>
        )}

        {nombreArchivo && !resultado && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-600">
                <span className="font-medium text-ink-900">{nombreArchivo}</span> · {filas.length} filas
              </p>
              <button type="button" onClick={reiniciar} className="text-xs font-medium text-ink-500 hover:underline">
                Elegir otro archivo
              </button>
            </div>

            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                <CheckCircle2 size={15} /> {validas.length} listas para importar
              </span>
              {invalidas.length > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-red-danger">
                  <XCircle size={15} /> {invalidas.length} con error
                </span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-ink-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                    <th className="px-3 py-2">Fila</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Precio venta</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filas.map((f) => (
                    <tr key={f.fila} className={f.errores.length > 0 ? 'bg-red-danger-bg/40' : undefined}>
                      <td className="px-3 py-2 text-ink-500">{f.fila}</td>
                      <td className="px-3 py-2 text-ink-900">{f.nombre || '—'}</td>
                      <td className="px-3 py-2 text-ink-700">{f.precioVenta ?? '—'}</td>
                      <td className="px-3 py-2 text-ink-700">{f.stock ?? 0}</td>
                      <td className="px-3 py-2">
                        {f.errores.length > 0 ? (
                          <span className="text-xs text-red-danger">{f.errores.join(', ')}</span>
                        ) : (
                          <span className="text-xs text-emerald-600">Lista</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button className="w-full" disabled={validas.length === 0 || importando} onClick={confirmarImportacion}>
              {importando ? 'Importando…' : `Importar ${validas.length} productos`}
            </Button>
          </>
        )}

        {resultado && (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-bg px-4 py-3 text-sm text-emerald-600">
              <span className="font-semibold">{resultado.totalCreados}</span> productos importados correctamente.
            </div>
            {resultado.totalOmitidos > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink-800">{resultado.totalOmitidos} omitidos:</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-ink-500">
                  {resultado.omitidos.map((o) => (
                    <li key={o.fila}>
                      Fila {o.fila} ({o.nombre}): {o.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button className="w-full" onClick={cerrar}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
