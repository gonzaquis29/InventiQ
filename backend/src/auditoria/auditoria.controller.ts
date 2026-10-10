import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private auditoria: AuditoriaService) {}

  @Get()
  listar(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('accion') accion?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.auditoria.listar({
      page: page ? Number(page) || 1 : undefined,
      pageSize: pageSize ? Number(pageSize) || undefined : undefined,
      accion,
      usuarioId,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
    });
  }
}
