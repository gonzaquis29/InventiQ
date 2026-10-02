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

@UseGuards(JwtAuthGuard)
@Controller('caja')
export class CajaController {
  constructor(private cajaService: CajaService) {}

  @Get('dia')
  resumenDia(@CurrentUser() user: AuthUser, @Query('fecha') fecha?: string) {
    return this.cajaService.resumenDia(user, fecha);
  }

  @Post('gastos')
  crearGasto(@Body() dto: CrearGastoDto, @CurrentUser() user: AuthUser) {
    return this.cajaService.crearGasto(user.userId, dto);
  }

  @Delete('gastos/:id')
  eliminarGasto(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.cajaService.eliminarGasto(id, user);
  }

  @Post('cuadres')
  crearCuadre(@Body() dto: CrearCuadreDto, @CurrentUser() user: AuthUser) {
    return this.cajaService.crearCuadre(user.userId, dto);
  }
}
