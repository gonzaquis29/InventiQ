import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
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

  @Post()
  create(@Body() dto: CreateCompraDto, @CurrentUser() user: AuthUser) {
    return this.comprasService.create(dto, user.userId);
  }
}
