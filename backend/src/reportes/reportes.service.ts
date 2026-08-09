import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface RangoFechas {
  desde?: Date;
  hasta?: Date;
}

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  async resumenVentas({ desde, hasta }: RangoFechas) {
    const ventas = await this.prisma.venta.findMany({
      where: { anulada: false, createdAt: { gte: desde, lte: hasta } },
      include: { usuario: { select: { nombre: true } } },
    });

    const totalVentas = ventas.reduce((acc, v) => acc + Number(v.total), 0);

    const porMetodoPago: Record<string, number> = {};
    for (const v of ventas) {
      porMetodoPago[v.metodoPago] = (porMetodoPago[v.metodoPago] ?? 0) + Number(v.total);
    }

    const porVendedor: Record<string, { nombre: string; total: number; cantidad: number }> = {};
    for (const v of ventas) {
      const key = v.usuarioId;
      if (!porVendedor[key]) porVendedor[key] = { nombre: v.usuario.nombre, total: 0, cantidad: 0 };
      porVendedor[key].total += Number(v.total);
      porVendedor[key].cantidad += 1;
    }

    return {
      cantidadVentas: ventas.length,
      totalVentas,
      porMetodoPago,
      porVendedor: Object.values(porVendedor),
    };
  }

  async productosMasVendidos({ desde, hasta }: RangoFechas, limit = 10) {
    const detalles = await this.prisma.detalleVenta.findMany({
      where: { venta: { anulada: false, createdAt: { gte: desde, lte: hasta } } },
      include: { producto: { select: { id: true, nombre: true } } },
    });

    const acumulado: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    for (const d of detalles) {
      const key = d.productoId;
      if (!acumulado[key]) acumulado[key] = { nombre: d.producto.nombre, cantidad: 0, total: 0 };
      acumulado[key].cantidad += d.cantidad;
      acumulado[key].total += d.cantidad * Number(d.precioUnitario) - Number(d.descuento);
    }

    return Object.values(acumulado)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, limit);
  }

  async ganancias({ desde, hasta }: RangoFechas) {
    const detalles = await this.prisma.detalleVenta.findMany({
      where: { venta: { anulada: false, createdAt: { gte: desde, lte: hasta } } },
      include: { producto: { select: { precioCompra: true } } },
    });

    let ingresos = 0;
    let costos = 0;
    for (const d of detalles) {
      ingresos += d.cantidad * Number(d.precioUnitario) - Number(d.descuento);
      costos += d.cantidad * Number(d.producto.precioCompra);
    }

    return { ingresos, costos, ganancia: ingresos - costos };
  }

  async valorizacionInventario(topN = 10) {
    const productos = await this.prisma.producto.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, stock: true, stockMinimo: true, precioCompra: true, precioVenta: true },
    });

    let valorCosto = 0;
    let valorVenta = 0;
    let totalUnidades = 0;
    let productosStockBajo = 0;

    const conValor = productos.map((p) => {
      const costo = p.stock * Number(p.precioCompra);
      const venta = p.stock * Number(p.precioVenta);
      valorCosto += costo;
      valorVenta += venta;
      totalUnidades += p.stock;
      if (p.stock <= p.stockMinimo) productosStockBajo++;
      return { id: p.id, nombre: p.nombre, stock: p.stock, valorCosto: costo, valorVenta: venta };
    });

    const topProductos = conValor.sort((a, b) => b.valorCosto - a.valorCosto).slice(0, topN);

    return {
      totalProductos: productos.length,
      totalUnidades,
      valorCosto,
      valorVenta,
      gananciaPotencial: valorVenta - valorCosto,
      productosStockBajo,
      topProductos,
    };
  }

  async cierresCaja({ desde, hasta }: RangoFechas) {
    const sesiones = await this.prisma.cajaSesion.findMany({
      where: { estado: 'CERRADA', fechaCierre: { gte: desde, lte: hasta } },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { fechaCierre: 'desc' },
    });

    return sesiones.map((s) => ({
      id: s.id,
      usuario: s.usuario.nombre,
      fechaApertura: s.fechaApertura,
      fechaCierre: s.fechaCierre,
      montoApertura: Number(s.montoApertura),
      montoEsperado: Number(s.montoEsperado),
      montoContado: Number(s.montoContado),
      diferencia: Number(s.diferencia),
    }));
  }
}
