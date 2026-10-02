export type Rol = 'ADMIN' | 'VENDEDOR';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

export interface Categoria {
  id: string;
  nombre: string;
}

export interface Marca {
  id: string;
  nombre: string;
}

export interface UnidadMedida {
  id: string;
  nombre: string;
  factor: number | null;
}

export interface UnidadProducto {
  id: string;
  productoId: string;
  nombre: string;
  factor: string;
}

export interface Producto {
  id: string;
  nombre: string;
  marca: string | null;
  codigoBarras: string | null;
  categoriaId: string | null;
  categoria: Categoria | null;
  precioCompra: string;
  precioVenta: string;
  margenGanancia: string | null;
  unidad: string;
  unidadesAlternativas: UnidadProducto[];
  stock: number;
  stockMinimo: number;
  activo: boolean;
  createdAt?: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MovimientoStock {
  id: string;
  tipo: 'VENTA' | 'COMPRA' | 'AJUSTE' | 'ANULACION_VENTA';
  cantidad: number;
  motivo: string | null;
  createdAt: string;
  usuario: { nombre: string };
}

export interface Proveedor {
  id: string;
  nombre: string;
  contacto: string | null;
  ruc: string | null;
  activo: boolean;
  createdAt: string;
}

export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN' | 'MIXTO';

export interface ItemCarrito {
  producto: Producto;
  unidadNombre: string;
  factorUnidad: number;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
}

export interface Venta {
  id: string;
  total: string;
  metodoPago: MetodoPago;
  montoEfectivo: string;
  montoDigital: string;
  anulada: boolean;
  motivoAnulacion: string | null;
  createdAt: string;
  usuario: { nombre: string };
  detalles: Array<{
    id: string;
    cantidad: number;
    precioUnitario: string;
    descuento: string;
    unidadVendida: string;
    factorUnidad: string;
    producto: { nombre: string };
  }>;
}

export interface GastoCaja {
  id: string;
  usuarioId: string;
  usuario: string;
  monto: number;
  motivo: string;
  createdAt: string;
}

export interface CuadreCaja {
  id: string;
  usuario: string;
  montoEsperado: number;
  montoContado: number;
  diferencia: number;
  nota: string | null;
  createdAt: string;
}

export interface ResumenCajaDia {
  fecha: string;
  esHoy: boolean;
  ventas: {
    cantidad: number;
    anuladas: number;
    total: number;
    efectivo: number;
    tarjeta: number;
    yapePlin: number;
    digitalMixto: number;
  };
  porVendedor: { nombre: string; cantidad: number; total: number }[];
  gastos: GastoCaja[];
  totalGastos: number;
  efectivoEsperado: number;
  cuadres: CuadreCaja[];
}
