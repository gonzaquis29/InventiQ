import { descargarCsv } from './csv';
import type { CierreCaja, Ganancias, ProductoVendido, ResumenVentas, ValorizacionInventario } from '@/components/reportes/types';

const SEPARADOR: string[] = [];

export function exportarReporteVentas(desde: string, hasta: string, resumen: ResumenVentas, masVendidos: ProductoVendido[], ganancias: Ganancias | null) {
  descargarCsv(`reporte-ventas_${desde}_${hasta}.csv`, [
    ['Reporte de ventas', `${desde} a ${hasta}`],
    SEPARADOR,
    ['Resumen'],
    ['Cantidad de ventas', resumen.cantidadVentas],
    ['Total vendido', resumen.totalVentas],
    ['Ingresos', ganancias?.ingresos ?? 0],
    ['Costos', ganancias?.costos ?? 0],
    ['Ganancia', ganancias?.ganancia ?? 0],
    SEPARADOR,
    ['Por método de pago'],
    ['Método', 'Monto'],
    ...Object.entries(resumen.porMetodoPago),
    SEPARADOR,
    ['Por vendedor'],
    ['Vendedor', 'Ventas', 'Total'],
    ...resumen.porVendedor.map((v) => [v.nombre, v.cantidad, v.total]),
    SEPARADOR,
    ['Por día'],
    ['Fecha', 'Total'],
    ...resumen.porDia.map((d) => [d.fecha, d.total]),
    SEPARADOR,
    ['Productos más vendidos'],
    ['Producto', 'Cantidad', 'Total'],
    ...masVendidos.map((p) => [p.nombre, p.cantidad, p.total]),
  ]);
}

export function exportarReporteInventario(inv: ValorizacionInventario) {
  descargarCsv(`reporte-inventario_${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Valorización de inventario'],
    SEPARADOR,
    ['Total de productos', inv.totalProductos],
    ['Total de unidades', inv.totalUnidades],
    ['Valorizado (costo)', inv.valorCosto],
    ['Valorizado (venta)', inv.valorVenta],
    ['Ganancia potencial', inv.gananciaPotencial],
    ['Productos con stock bajo', inv.productosStockBajo],
    SEPARADOR,
    ['Productos con más capital invertido'],
    ['Producto', 'Stock', 'Valor costo', 'Valor venta'],
    ...inv.topProductos.map((p) => [p.nombre, p.stock, p.valorCosto, p.valorVenta]),
  ]);
}

export function exportarReporteCaja(desde: string, hasta: string, cierres: CierreCaja[]) {
  descargarCsv(`reporte-caja_${desde}_${hasta}.csv`, [
    ['Fecha de cierre', 'Usuario', 'Esperado', 'Contado', 'Diferencia'],
    ...cierres.map((c) => [new Date(c.fechaCierre).toLocaleString('es-PE'), c.usuario, c.montoEsperado, c.montoContado, c.diferencia]),
  ]);
}
