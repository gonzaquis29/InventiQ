import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/anular-venta.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Rol } from '@prisma/client';
import { Auditar } from '../auditoria/auditar.decorator';

@UseGuards(JwtAuthGuard)
@Controller('ventas')
export class VentasController {
  constructor(private ventasService: VentasService) {}

  @Get()
  findAll(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ventasService.findAll({
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
      page: page ? Number(page) || 1 : undefined,
      pageSize: pageSize ? Number(pageSize) || undefined : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(id);
  }

  @Auditar({
    accion: 'VENTA_CREADA',
    entidad: 'venta',
    entidadId: (r) => r.id,
    detalle: (r) => `Venta de S/ ${Number(r.total).toFixed(2)} (${r.metodoPago}, ${r.detalles.length} ítem${r.detalles.length === 1 ? '' : 's'})`,
  })
  @Post()
  create(@Body() dto: CreateVentaDto, @CurrentUser() user: AuthUser) {
    return this.ventasService.create(dto, user.userId);
  }

  @Auditar({
    accion: 'VENTA_ANULADA',
    entidad: 'venta',
    entidadId: (_r, req) => req.params.id,
    detalle: (r, req) => `Venta de S/ ${Number(r.total).toFixed(2)} anulada. Motivo: ${req.body.motivo}`,
  })
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Post(':id/anular')
  anular(@Param('id') id: string, @Body() dto: AnularVentaDto, @CurrentUser() user: AuthUser) {
    return this.ventasService.anular(id, dto, user.userId);
  }
}
