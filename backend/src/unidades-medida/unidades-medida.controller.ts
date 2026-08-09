import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { UnidadesMedidaService } from './unidades-medida.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '@prisma/client';

class UnidadMedidaDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  factor?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('unidades-medida')
export class UnidadesMedidaController {
  constructor(private unidadesMedidaService: UnidadesMedidaService) {}

  @Get()
  findAll() {
    return this.unidadesMedidaService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Post()
  create(@Body() dto: UnidadMedidaDto) {
    return this.unidadesMedidaService.create(dto.nombre, dto.factor);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UnidadMedidaDto) {
    return this.unidadesMedidaService.update(id, dto.nombre, dto.factor);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unidadesMedidaService.remove(id);
  }
}
