import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { ImportarProductosDto } from './dto/importar-productos.dto';
import { CreateUnidadProductoDto } from './dto/unidad-producto.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Rol } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('productos')
export class ProductosController {
  constructor(private productosService: ProductosService) {}

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('soloActivos') soloActivos?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('marca') marca?: string,
    @Query('stockBajo') stockBajo?: string,
    @Query('nuevos') nuevos?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.productosService.findAll({
      q,
      soloActivos: soloActivos !== 'false',
      categoriaId,
      marca,
      stockBajo: stockBajo === 'true',
      nuevos: nuevos === 'true',
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('stock-bajo')
  findStockBajo() {
    return this.productosService.findStockBajo();
  }

  @Get('codigo/:codigo')
  findByCodigoBarras(@Param('codigo') codigo: string) {
    return this.productosService.findByCodigoBarras(codigo);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(id);
  }

  @Get(':id/movimientos')
  historialMovimientos(@Param('id') id: string) {
    return this.productosService.historialMovimientos(id);
  }

  @Get(':id/unidades')
  findUnidades(@Param('id') id: string) {
    return this.productosService.findUnidades(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Post(':id/unidades')
  createUnidad(@Param('id') id: string, @Body() dto: CreateUnidadProductoDto) {
    return this.productosService.createUnidad(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Delete(':id/unidades/:unidadId')
  removeUnidad(@Param('id') id: string, @Param('unidadId') unidadId: string) {
    return this.productosService.removeUnidad(id, unidadId);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Post()
  create(@Body() dto: CreateProductoDto) {
    return this.productosService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productosService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Post('importar')
  importar(@Body() dto: ImportarProductosDto) {
    return this.productosService.importar(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @Post(':id/ajustar-stock')
  ajustarStock(@Param('id') id: string, @Body() dto: AjustarStockDto, @CurrentUser() user: AuthUser) {
    return this.productosService.ajustarStock(id, dto, user.userId);
  }
}
