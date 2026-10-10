import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EventoAuditoria {
  usuarioId?: string | null;
  // Solo para eventos sin usuario (ej. login fallido): se guarda tal cual.
  usuarioNombre?: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  detalle: string;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private prisma: PrismaService) {}

  // Nunca lanza: un fallo de auditoría no debe tumbar una venta ni otra operación ya hecha.
  async registrar(evento: EventoAuditoria) {
    try {
      let nombre = evento.usuarioNombre;
      if (!nombre && evento.usuarioId) {
        const u = await this.prisma.usuario.findUnique({
          where: { id: evento.usuarioId },
          select: { nombre: true },
        });
        nombre = u?.nombre;
      }
      await this.prisma.auditLog.create({
        data: {
          usuarioId: evento.usuarioId ?? null,
          usuarioNombre: nombre ?? 'Desconocido',
          accion: evento.accion,
          entidad: evento.entidad,
          entidadId: evento.entidadId,
          detalle: evento.detalle,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo registrar auditoría (${evento.accion})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async listar(params: {
    page?: number;
    pageSize?: number;
    accion?: string;
    usuarioId?: string;
    desde?: Date;
    hasta?: Date;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);
    const where = {
      accion: params.accion || undefined,
      usuarioId: params.usuarioId || undefined,
      createdAt: { gte: params.desde, lte: params.hasta },
    };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }
}
