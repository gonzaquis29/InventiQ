import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CajaService } from './caja.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { MovimientoCajaDto } from './dto/movimiento-caja.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('caja')
export class CajaController {
  constructor(private cajaService: CajaService) {}

  @Get('actual')
  actual(@CurrentUser() user: AuthUser) {
    return this.cajaService.actual(user.userId);
  }

  @Get('historial')
  historial() {
    return this.cajaService.historial();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cajaService.findOne(id);
  }

  @Post('abrir')
  abrir(@Body() dto: AbrirCajaDto, @CurrentUser() user: AuthUser) {
    return this.cajaService.abrir(user.userId, dto);
  }

  @Post(':id/movimiento')
  registrarMovimiento(@Param('id') id: string, @Body() dto: MovimientoCajaDto) {
    return this.cajaService.registrarMovimiento(id, dto);
  }

  @Post(':id/cerrar')
  cerrar(@Param('id') id: string, @Body() dto: CerrarCajaDto) {
    return this.cajaService.cerrar(id, dto);
  }
}
