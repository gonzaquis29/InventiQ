import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('reportes')
export class ReportesController {
  constructor(private reportesService: ReportesService) {}

  private rango(desde?: string, hasta?: string) {
    return { desde: desde ? new Date(desde) : undefined, hasta: hasta ? new Date(hasta) : undefined };
  }

  @Get('ventas')
  resumenVentas(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.reportesService.resumenVentas(this.rango(desde, hasta));
  }

  @Get('productos-mas-vendidos')
  productosMasVendidos(@Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('limit') limit?: string) {
    return this.reportesService.productosMasVendidos(this.rango(desde, hasta), limit ? Number(limit) : 10);
  }

  @Get('productos-sin-rotacion')
  productosSinRotacion(@Query('desde') desde?: string, @Query('hasta') hasta?: string, @Query('limit') limit?: string) {
    return this.reportesService.productosSinRotacion(this.rango(desde, hasta), limit ? Number(limit) : 20);
  }

  @Get('ganancias')
  ganancias(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.reportesService.ganancias(this.rango(desde, hasta));
  }

  @Get('caja')
  cuadresCaja(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.reportesService.cuadresCaja(this.rango(desde, hasta));
  }

  @Get('inventario')
  valorizacionInventario(@Query('limit') limit?: string) {
    return this.reportesService.valorizacionInventario(limit ? Number(limit) : 10);
  }
}
