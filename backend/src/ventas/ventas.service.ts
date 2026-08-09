import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/anular-venta.dto';
import { EstadoCaja, MetodoPago, TipoMovimientoCaja, TipoMovimientoStock } from '@prisma/client';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  findAll(params: { desde?: Date; hasta?: Date }) {
    return this.prisma.venta.findMany({
      where: {
        createdAt: {
          gte: params.desde,
          lte: params.hasta,
        },
      },
      include: {
        usuario: { select: { nombre: true } },
        detalles: { include: { producto: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
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
    const cajaSesion = await this.prisma.cajaSesion.findFirst({
      where: { usuarioId, estado: EstadoCaja.ABIERTA },
    });
    if (!cajaSesion) {
      throw new BadRequestException('Debes abrir tu caja antes de registrar ventas');
    }

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
      return { ...d, precioUnitario, descuento, unidadVendida, factorUnidad };
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
          cajaSesionId: cajaSesion.id,
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

      if (montoEfectivo > 0) {
        await tx.movimientoCaja.create({
          data: {
            cajaSesionId: cajaSesion.id,
            ventaId: venta.id,
            tipo: TipoMovimientoCaja.VENTA,
            monto: montoEfectivo,
            motivo: 'Venta',
          },
        });
      }

      return venta;
    });
  }

  async anular(id: string, dto: AnularVentaDto, usuarioId: string) {
    const venta = await this.findOne(id);
    if (venta.anulada) throw new BadRequestException('La venta ya está anulada');

    return this.prisma.$transaction(async (tx) => {
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

      if (venta.cajaSesionId && Number(venta.montoEfectivo) > 0) {
        await tx.movimientoCaja.create({
          data: {
            cajaSesionId: venta.cajaSesionId,
            ventaId: venta.id,
            tipo: TipoMovimientoCaja.RETIRO,
            monto: venta.montoEfectivo,
            motivo: 'Anulación de venta',
          },
        });
      }

      return tx.venta.update({
        where: { id },
        data: { anulada: true, motivoAnulacion: dto.motivo },
      });
    });
  }
}
