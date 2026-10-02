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

export interface ProductoSinRotacion {
  id: string;
  nombre: string;
  stock: number;
  valorCosto: number;
}

export interface Ganancias {
  ingresos: number;
  costos: number;
  ganancia: number;
}

export interface CuadreCajaReporte {
  id: string;
  usuario: string;
  fecha: string;
  efectivoVentas: number;
  gastos: number;
  montoEsperado: number;
  montoContado: number;
  diferencia: number;
  nota: string | null;
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
