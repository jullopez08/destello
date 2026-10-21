import { Workbook, type Worksheet } from 'exceljs';
import type { ReportRange } from './report-range';

// Formato común de los Excel de Destello: título, negocio y fechas arriba, encabezado en negrita y fijo, pesos con
// puntos de miles y una fila de totales. Así el contador los lee igual sin importar cuál descargue.

export type Cell = string | number | null;
export interface Column {
  header: string;
  width?: number;
  /** money = pesos, qty = cantidad con decimales, int = entero */
  kind?: 'text' | 'money' | 'qty' | 'int';
  /** Suma la columna en la fila de totales */
  total?: boolean;
}

const MONEY = '"$"#,##0';
const QTY = '#,##0.##';
const INT = '#,##0';
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1C2' } } as const;

export function workbook() {
  const wb = new Workbook();
  wb.creator = 'Destello';
  wb.created = new Date();
  return wb;
}

/** Una hoja con título, filas y totales. `note` va debajo del título (una frase). */
export function addSheet(wb: Workbook, name: string, info: { title: string; business: string; range?: ReportRange; note?: string }, columns: Column[], rows: Cell[][]): Worksheet {
  const ws = wb.addWorksheet(name.slice(0, 31));
  ws.addRow([info.title]).font = { bold: true, size: 14 };
  ws.addRow([info.range ? `${info.business} · del ${dmy(info.range.from)} al ${dmy(info.range.to)}` : info.business]);
  if (info.note) ws.addRow([info.note]).font = { italic: true, color: { argb: 'FF6B5446' } };
  ws.addRow([]);

  const header = ws.addRow(columns.map((c) => c.header));
  header.font = { bold: true };
  header.eachCell((cell) => (cell.fill = HEADER_FILL));
  ws.views = [{ state: 'frozen', ySplit: header.number }];

  for (const r of rows) ws.addRow(r);
  if (columns.some((c) => c.total) && rows.length) {
    const totals = ws.addRow(columns.map((c, i) => (i === 0 ? 'Total' : c.total ? rows.reduce((a, r) => a + (Number(r[i]) || 0), 0) : null)));
    totals.font = { bold: true };
    totals.eachCell((cell) => (cell.border = { top: { style: 'thin' } }));
  }

  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = c.width ?? Math.min(40, Math.max(12, c.header.length + 2));
    const fmt = c.kind === 'money' ? MONEY : c.kind === 'qty' ? QTY : c.kind === 'int' ? INT : undefined;
    if (fmt) col.eachCell((cell, row) => { if (row > header.number) cell.numFmt = fmt; });
  });
  return ws;
}

export async function toBuffer(wb: Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** "2026-10-21" → "21/10/2026" */
export const dmy = (iso: string) => iso.split('-').reverse().join('/');

/** Hora de Bogotá de un instante, "3:40 p. m." */
export const hm = (d: Date) => d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

/** Cantidad en kg, l o und (los insumos se guardan en g y ml), con 3 decimales como mucho */
export function qtyUnit(qty: number, kind: 'MASS' | 'VOLUME' | 'UNIT'): [number, string] {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  if (kind === 'UNIT') return [round(qty), 'und'];
  return [round(qty / 1000), kind === 'MASS' ? 'kg' : 'l'];
}
