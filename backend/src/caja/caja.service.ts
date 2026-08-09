import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { MovimientoCajaDto } from './dto/movimiento-caja.dto';
import { EstadoCaja, TipoMovimientoCaja } from '@prisma/client';

@Injectable()
export class CajaService {
  constructor(private prisma: PrismaService) {}

  async abrir(usuarioId: string, dto: AbrirCajaDto) {
    const abierta = await this.prisma.cajaSesion.findFirst({
      where: { usuarioId, estado: EstadoCaja.ABIERTA },
    });
    if (abierta) throw new BadRequestException('Ya tienes una caja abierta');

    return this.prisma.cajaSesion.create({
      data: { usuarioId, montoApertura: dto.montoApertura },
    });
  }

  async actual(usuarioId: string) {
    return this.prisma.cajaSesion.findFirst({
      where: { usuarioId, estado: EstadoCaja.ABIERTA },
      include: { movimientosCaja: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async findOne(id: string) {
    const sesion = await this.prisma.cajaSesion.findUnique({
      where: { id },
      include: { movimientosCaja: { orderBy: { createdAt: 'desc' } }, usuario: { select: { nombre: true } } },
    });
    if (!sesion) throw new NotFoundException('Sesión de caja no encontrada');
    return sesion;
  }

  historial() {
    return this.prisma.cajaSesion.findMany({
      include: { usuario: { select: { nombre: true } } },
      orderBy: { fechaApertura: 'desc' },
      take: 60,
    });
  }

  private async calcularMontoEsperado(cajaSesionId: string, montoApertura: number) {
    const movimientos = await this.prisma.movimientoCaja.findMany({ where: { cajaSesionId } });
    const ingresos = movimientos
      .filter((m) => m.tipo === TipoMovimientoCaja.VENTA || m.tipo === TipoMovimientoCaja.INGRESO)
      .reduce((acc, m) => acc + Number(m.monto), 0);
    const retiros = movimientos
      .filter((m) => m.tipo === TipoMovimientoCaja.RETIRO)
      .reduce((acc, m) => acc + Number(m.monto), 0);
    return montoApertura + ingresos - retiros;
  }

  async registrarMovimiento(cajaSesionId: string, dto: MovimientoCajaDto) {
    const sesion = await this.findOne(cajaSesionId);
    if (sesion.estado !== EstadoCaja.ABIERTA) {
      throw new BadRequestException('La caja ya está cerrada');
    }
    return this.prisma.movimientoCaja.create({
      data: {
        cajaSesionId,
        tipo: dto.tipo === 'RETIRO' ? TipoMovimientoCaja.RETIRO : TipoMovimientoCaja.INGRESO,
        monto: dto.monto,
        motivo: dto.motivo,
      },
    });
  }

  async cerrar(cajaSesionId: string, dto: CerrarCajaDto) {
    const sesion = await this.findOne(cajaSesionId);
    if (sesion.estado !== EstadoCaja.ABIERTA) {
      throw new BadRequestException('La caja ya está cerrada');
    }

    const montoEsperado = await this.calcularMontoEsperado(cajaSesionId, Number(sesion.montoApertura));
    const diferencia = dto.montoContado - montoEsperado;

    return this.prisma.cajaSesion.update({
      where: { id: cajaSesionId },
      data: {
        estado: EstadoCaja.CERRADA,
        fechaCierre: new Date(),
        montoContado: dto.montoContado,
        montoEsperado,
        diferencia,
      },
    });
  }
}
