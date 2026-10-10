import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CajaService } from './caja.service';
import { CrearGastoDto } from './dto/crear-gasto.dto';
import { CrearCuadreDto } from './dto/crear-cuadre.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Auditar } from '../auditoria/auditar.decorator';

@UseGuards(JwtAuthGuard)
@Controller('caja')
export class CajaController {
  constructor(private cajaService: CajaService) {}

  @Get('dia')
  resumenDia(@CurrentUser() user: AuthUser, @Query('fecha') fecha?: string) {
    return this.cajaService.resumenDia(user, fecha);
  }

  @Auditar({
    accion: 'GASTO_REGISTRADO',
    entidad: 'gasto',
    entidadId: (r) => r.id,
    detalle: (r) => `Gasto de S/ ${Number(r.monto).toFixed(2)}: ${r.motivo}`,
  })
  @Post('gastos')
  crearGasto(@Body() dto: CrearGastoDto, @CurrentUser() user: AuthUser) {
    return this.cajaService.crearGasto(user.userId, dto);
  }

  @Auditar({
    accion: 'GASTO_ELIMINADO',
    entidad: 'gasto',
    entidadId: (_r, req) => req.params.id,
    detalle: () => 'Gasto eliminado',
  })
  @Delete('gastos/:id')
  eliminarGasto(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.cajaService.eliminarGasto(id, user);
  }

  @Auditar({
    accion: 'CUADRE_REGISTRADO',
    entidad: 'cuadre',
    entidadId: (r) => r.id,
    detalle: (r) =>
      `Esperado S/ ${r.montoEsperado.toFixed(2)}, contado S/ ${r.montoContado.toFixed(2)}, diferencia S/ ${r.diferencia.toFixed(2)}`,
  })
  @Post('cuadres')
  crearCuadre(@Body() dto: CrearCuadreDto, @CurrentUser() user: AuthUser) {
    return this.cajaService.crearCuadre(user.userId, dto);
  }
}
