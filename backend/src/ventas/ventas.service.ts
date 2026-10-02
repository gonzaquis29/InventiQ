import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/anular-venta.dto';
import { MetodoPago, TipoMovimientoStock } from '@prisma/client';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { desde?: Date; hasta?: Date; page?: number; pageSize?: number }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const where = { createdAt: { gte: params.desde, lte: params.hasta } };

    const [data, total] = await Promise.all([
      this.prisma.venta.findMany({
        where,
        include: {
          usuario: { select: { nombre: true } },
          detalles: { include: { producto: { select: { nombre: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.venta.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: {
        usuario: { select: { nombre: true } },
        detalles: { include: { producto: true } },
      },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return venta;
  }

  async create(dto: CreateVentaDto, usuarioId: string) {
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: dto.detalles.map((d) => d.productoId) } },
    });

    let total = 0;
    const detallesConPrecio = dto.detalles.map((d) => {
      const producto = productos.find((p) => p.id === d.productoId);
      if (!producto) throw new NotFoundException(`Producto ${d.productoId} no encontrado`);
      const precioUnitario = d.precioUnitario ?? Number(producto.precioVenta);
      const descuento = d.descuento ?? 0;
      const unidadVendida = d.unidadVendida ?? producto.unidad;
      const factorUnidad = d.factorUnidad ?? 1;
      total += d.cantidad * precioUnitario - descuento;
      const costoUnitario = Number(producto.precioCompra);
      return { ...d, precioUnitario, descuento, unidadVendida, factorUnidad, costoUnitario };
    });

    if (total < 0) throw new BadRequestException('El total de la venta no puede ser negativo');

    const montoEfectivo = dto.metodoPago === MetodoPago.MIXTO ? dto.montoEfectivo ?? 0 : dto.metodoPago === MetodoPago.EFECTIVO ? total : 0;
    const montoDigital = dto.metodoPago === MetodoPago.MIXTO ? dto.montoDigital ?? 0 : dto.metodoPago !== MetodoPago.EFECTIVO ? total : 0;

    if (dto.metodoPago === MetodoPago.MIXTO && Math.abs(montoEfectivo + montoDigital - total) > 0.01) {
      throw new BadRequestException('La suma de efectivo y pago digital debe ser igual al total');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const detalle of detallesConPrecio) {
        const resultado = await tx.producto.updateMany({
          where: { id: detalle.productoId, stock: { gte: detalle.cantidad } },
          data: { stock: { decrement: detalle.cantidad } },
        });
        if (resultado.count === 0) {
          const producto = productos.find((p) => p.id === detalle.productoId);
          throw new BadRequestException(`Stock insuficiente para "${producto?.nombre ?? detalle.productoId}"`);
        }
      }

      const venta = await tx.venta.create({
        data: {
          usuarioId,
          total,
          metodoPago: dto.metodoPago,
          montoEfectivo,
          montoDigital,
          detalles: {
            create: detallesConPrecio.map((d) => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              descuento: d.descuento,
              unidadVendida: d.unidadVendida,
              factorUnidad: d.factorUnidad,
              costoUnitario: d.costoUnitario,
            })),
          },
        },
        include: { detalles: true },
      });

      for (const detalle of detallesConPrecio) {
        await tx.movimientoStock.create({
          data: {
            productoId: detalle.productoId,
            tipo: TipoMovimientoStock.VENTA,
            cantidad: -detalle.cantidad,
            motivo: 'Venta',
            usuarioId,
          },
        });
      }

      return venta;
    });
  }

  async anular(id: string, dto: AnularVentaDto, usuarioId: string) {
    const venta = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Marcar primero y solo si sigue vigente: si dos anulaciones llegan a la vez, solo una
      // pasa este filtro y el stock se devuelve una sola vez.
      const marcada = await tx.venta.updateMany({
        where: { id, anulada: false },
        data: { anulada: true, motivoAnulacion: dto.motivo },
      });
      if (marcada.count === 0) throw new BadRequestException('La venta ya está anulada');

      for (const detalle of venta.detalles) {
        await tx.producto.update({
          where: { id: detalle.productoId },
          data: { stock: { increment: detalle.cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: detalle.productoId,
            tipo: TipoMovimientoStock.ANULACION_VENTA,
            cantidad: detalle.cantidad,
            motivo: `Anulación: ${dto.motivo}`,
            usuarioId,
          },
        });
      }

      return tx.venta.findUniqueOrThrow({ where: { id } });
    });
  }
}
