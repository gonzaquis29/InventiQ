export interface ResumenVentas {
  cantidadVentas: number;
  totalVentas: number;
  porMetodoPago: Record<string, number>;
  porVendedor: { nombre: string; total: number; cantidad: number }[];
  porDia: { fecha: string; total: number }[];
}

export interface ProductoVendido {
  nombre: string;
  cantidad: number;
  total: number;
}

export interface Ganancias {
  ingresos: number;
  costos: number;
  ganancia: number;
}

export interface CierreCaja {
  id: string;
  usuario: string;
  fechaCierre: string;
  montoEsperado: number;
  montoContado: number;
  diferencia: number;
}

export interface ValorizacionInventario {
  totalProductos: number;
  totalUnidades: number;
  valorCosto: number;
  valorVenta: number;
  gananciaPotencial: number;
  productosStockBajo: number;
  topProductos: { id: string; nombre: string; stock: number; valorCosto: number; valorVenta: number }[];
}
