import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { TipoMovimientoStock } from '@prisma/client';

@Injectable()
export class ComprasService {
  constructor(private prisma: PrismaService) {}

  findAll(params: { proveedorId?: string; productoId?: string } = {}) {
    return this.prisma.compra.findMany({
      where: {
        proveedorId: params.proveedorId || undefined,
        detalles: params.productoId ? { some: { productoId: params.productoId } } : undefined,
      },
      include: {
        proveedor: true,
        usuario: { select: { nombre: true } },
        detalles: { include: { producto: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const compra = await this.prisma.compra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        usuario: { select: { nombre: true } },
        detalles: { include: { producto: { select: { nombre: true, unidad: true } } } },
      },
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    return compra;
  }

  create(dto: CreateCompraDto, usuarioId: string) {
    const lineas = dto.detalles.map((d) => {
      const factorUnidad = d.factorUnidad ?? 1;
      const cantidad = d.cantidadComprada * factorUnidad; // unidades de venta recibidas
      const costoUnitario = d.costoUnitarioCompra / factorUnidad; // costo por unidad de venta
      return {
        productoId: d.productoId,
        unidadCompra: d.unidadCompra ?? 'unidad',
        factorUnidad,
        cantidadComprada: d.cantidadComprada,
        costoUnitarioCompra: d.costoUnitarioCompra,
        cantidad,
        costoUnitario,
      };
    });

    const total = lineas.reduce((acc, l) => acc + l.cantidadComprada * l.costoUnitarioCompra, 0);

    return this.prisma.$transaction(async (tx) => {
      const compra = await tx.compra.create({
        data: {
          proveedorId: dto.proveedorId,
          usuarioId,
          total,
          detalles: { create: lineas },
        },
        include: { detalles: true },
      });

      for (const linea of lineas) {
        await tx.producto.update({
          where: { id: linea.productoId },
          data: {
            stock: { increment: linea.cantidad },
            precioCompra: linea.costoUnitario,
          },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: linea.productoId,
            tipo: TipoMovimientoStock.COMPRA,
            cantidad: linea.cantidad,
            motivo: `Compra: ${linea.cantidadComprada} ${linea.unidadCompra}`,
            usuarioId,
          },
        });
      }

      return compra;
    });
  }
}
