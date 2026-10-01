function detectDelimiter(sample: string): ',' | ';' {
  const headerLine = sample.split(/\r\n|\n/, 1)[0] ?? '';
  const commas = (headerLine.match(/,/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

/** Parser CSV mínimo compatible con RFC4180: soporta campos entre comillas, comillas escapadas (""), y saltos de línea dentro de campos citados. */
export function parseCsv(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === delimiter) {
      row.push(field.trim());
      field = '';
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell !== ''));
}

const COMBINING_MARKS_RANGE_START = 0x0300;
const COMBINING_MARKS_RANGE_END = 0x036f;

function stripDiacritics(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= COMBINING_MARKS_RANGE_START && code <= COMBINING_MARKS_RANGE_END) continue;
    out += ch;
  }
  return out;
}

function normalizeHeader(h: string): string {
  return stripDiacritics(h.normalize('NFD'))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const ALIAS: Record<string, string[]> = {
  nombre: ['nombre', 'producto'],
  marca: ['marca'],
  categoria: ['categoria'],
  codigoBarras: ['codigo', 'codigobarras', 'codbarras', 'codigodebarras'],
  precioCompra: ['preciocompra', 'costo', 'preciodecompra'],
  precioVenta: ['precioventa', 'precio', 'preciodeventa'],
  unidad: ['unidad', 'unidaddeventa'],
  unidadCompra: ['unidadcompra', 'unidaddecompra'],
  factorCompra: ['factorcompra', 'equivalea', 'factor', 'equivalencia'],
  stock: ['stock', 'cantidad', 'stockactual'],
  stockMinimo: ['stockminimo', 'minimo'],
};

export const CAMPOS_PLANTILLA_IMPORTACION = [
  'nombre',
  'marca',
  'categoria',
  'codigoBarras',
  'precioCompra',
  'precioVenta',
  'unidad',
  'unidadCompra',
  'factorCompra',
  'stock',
  'stockMinimo',
] as const;

/** Mapea las columnas de un CSV (por nombre de encabezado, tolerante a variaciones) a los campos que usa la importación. */
export function mapearColumnas(headerRow: string[]): Partial<Record<keyof typeof ALIAS, number>> {
  const normalizados = headerRow.map(normalizeHeader);
  const mapa: Partial<Record<string, number>> = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    const idx = normalizados.findIndex((h) => alias.includes(h));
    if (idx !== -1) mapa[campo] = idx;
  }
  return mapa;
}

type CeldaCsv = string | number;

function escaparCelda(valor: CeldaCsv): string {
  const s = String(valor);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Descarga filas como CSV (UTF-8 con BOM para que Excel respete tildes). */
export function descargarCsv(nombreArchivo: string, filas: CeldaCsv[][]) {
  const contenido = filas.map((fila) => fila.map(escaparCelda).join(',')).join('\r\n');
  const blob = new Blob(['﻿', contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
