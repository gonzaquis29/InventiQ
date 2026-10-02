import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MetodoPago, Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearGastoDto } from './dto/crear-gasto.dto';
import { CrearCuadreDto } from './dto/crear-cuadre.dto';
import { esFechaValida, hoyLima, rangoDia } from './dia';
import type { AuthUser } from '../common/decorators/current-user.decorator';

const redondear = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class CajaService {
  constructor(private prisma: PrismaService) {}

  private async totalesDelDia(fecha: string) {
    const { desde, hasta } = rangoDia(fecha);
    const [ventas, gastos] = await Promise.all([
      this.prisma.venta.findMany({
        where: { createdAt: { gte: desde, lt: hasta } },
        select: {
          usuarioId: true,
          total: true,
          metodoPago: true,
          montoEfectivo: true,
          montoDigital: true,
          anulada: true,
          usuario: { select: { nombre: true } },
        },
      }),
      this.prisma.gastoCaja.findMany({
        where: { createdAt: { gte: desde, lt: hasta } },
        include: { usuario: { select: { nombre: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const vigentes = ventas.filter((v) => !v.anulada);
    const porMetodo = { efectivo: 0, tarjeta: 0, yapePlin: 0, digitalMixto: 0 };
    const porVendedor = new Map<
      string,
      { nombre: string; cantidad: number; total: number }
    >();

    for (const v of vigentes) {
      porMetodo.efectivo += Number(v.montoEfectivo);
      if (v.metodoPago === MetodoPago.TARJETA)
        porMetodo.tarjeta += Number(v.total);
      if (v.metodoPago === MetodoPago.YAPE_PLIN)
        porMetodo.yapePlin += Number(v.total);
      if (v.metodoPago === MetodoPago.MIXTO)
        porMetodo.digitalMixto += Number(v.montoDigital);

      const vendedor = porVendedor.get(v.usuarioId) ?? {
        nombre: v.usuario.nombre,
        cantidad: 0,
        total: 0,
      };
      vendedor.cantidad += 1;
      vendedor.total += Number(v.total);
      porVendedor.set(v.usuarioId, vendedor);
    }

    const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0);

    return {
      ventas: {
        cantidad: vigentes.length,
        anuladas: ventas.length - vigentes.length,
        total: redondear(vigentes.reduce((acc, v) => acc + Number(v.total), 0)),
        efectivo: redondear(porMetodo.efectivo),
        tarjeta: redondear(porMetodo.tarjeta),
        yapePlin: redondear(porMetodo.yapePlin),
        digitalMixto: redondear(porMetodo.digitalMixto),
      },
      porVendedor: [...porVendedor.values()]
        .sort((a, b) => b.total - a.total)
        .map((v) => ({ ...v, total: redondear(v.total) })),
      gastos: gastos.map((g) => ({
        id: g.id,
        usuarioId: g.usuarioId,
        usuario: g.usuario.nombre,
        monto: Number(g.monto),
        motivo: g.motivo,
        createdAt: g.createdAt,
      })),
      totalGastos: redondear(totalGastos),
      efectivoEsperado: redondear(porMetodo.efectivo - totalGastos),
    };
  }

  async resumenDia(user: AuthUser, fecha?: string) {
    const hoy = hoyLima();
    const dia = fecha ?? hoy;
    if (!esFechaValida(dia))
      throw new BadRequestException(
        'Fecha inválida, usa el formato AAAA-MM-DD',
      );
    if (dia !== hoy && user.rol !== Rol.ADMIN)
      throw new ForbiddenException(
        'Solo el administrador puede ver días anteriores',
      );

    const { desde, hasta } = rangoDia(dia);
    const [totales, cuadres] = await Promise.all([
      this.totalesDelDia(dia),
      this.prisma.cuadreCaja.findMany({
        where: { createdAt: { gte: desde, lt: hasta } },
        include: { usuario: { select: { nombre: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      fecha: dia,
      esHoy: dia === hoy,
      ...totales,
      cuadres: cuadres.map((c) => ({
        id: c.id,
        usuario: c.usuario.nombre,
        montoEsperado: Number(c.montoEsperado),
        montoContado: Number(c.montoContado),
        diferencia: Number(c.diferencia),
        nota: c.nota,
        createdAt: c.createdAt,
      })),
    };
  }

  crearGasto(usuarioId: string, dto: CrearGastoDto) {
    return this.prisma.gastoCaja.create({
      data: { usuarioId, monto: dto.monto, motivo: dto.motivo.trim() },
    });
  }

  async eliminarGasto(id: string, user: AuthUser) {
    const gasto = await this.prisma.gastoCaja.findUnique({ where: { id } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    if (gasto.usuarioId !== user.userId && user.rol !== Rol.ADMIN) {
      throw new ForbiddenException(
        'Solo quien registró el gasto o un administrador puede eliminarlo',
      );
    }
    await this.prisma.gastoCaja.delete({ where: { id } });
    return { ok: true };
  }

  async crearCuadre(usuarioId: string, dto: CrearCuadreDto) {
    const { ventas, totalGastos, efectivoEsperado } =
      await this.totalesDelDia(hoyLima());
    const cuadre = await this.prisma.cuadreCaja.create({
      data: {
        usuarioId,
        efectivoVentas: ventas.efectivo,
        gastos: totalGastos,
        montoEsperado: efectivoEsperado,
        montoContado: dto.montoContado,
        diferencia: redondear(dto.montoContado - efectivoEsperado),
        nota: dto.nota?.trim() || null,
      },
    });
    return {
      ...cuadre,
      montoEsperado: Number(cuadre.montoEsperado),
      montoContado: Number(cuadre.montoContado),
      diferencia: Number(cuadre.diferencia),
    };
  }
}
