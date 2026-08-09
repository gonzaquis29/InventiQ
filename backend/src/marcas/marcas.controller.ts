import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { MarcasService } from './marcas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '@prisma/client';

class MarcaDto {
  @IsString()
  @MinLength(1)
  nombre: string;
}

@UseGuards(JwtAuthGuard)
@Controller('marcas')
export class MarcasController {
  constructor(private marcasService: MarcasService) {}

  @Get()
  findAll() {
    return this.marcasService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Post()
  create(@Body() dto: MarcaDto) {
    return this.marcasService.create(dto.nombre);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: MarcaDto) {
    return this.marcasService.update(id, dto.nombre);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.marcasService.remove(id);
  }
}
