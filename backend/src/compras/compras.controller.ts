import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Auditar } from '../auditoria/auditar.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('compras')
export class ComprasController {
  constructor(private comprasService: ComprasService) {}

  @Get()
  findAll(@Query('proveedorId') proveedorId?: string, @Query('productoId') productoId?: string) {
    return this.comprasService.findAll({ proveedorId, productoId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comprasService.findOne(id);
  }

  @Auditar({
    accion: 'COMPRA_REGISTRADA',
    entidad: 'compra',
    entidadId: (r) => r.id,
    detalle: (r) => `Compra de S/ ${Number(r.total).toFixed(2)} (${r.detalles.length} ítem${r.detalles.length === 1 ? '' : 's'})`,
  })
  @Post()
  create(@Body() dto: CreateCompraDto, @CurrentUser() user: AuthUser) {
    return this.comprasService.create(dto, user.userId);
  }
}
