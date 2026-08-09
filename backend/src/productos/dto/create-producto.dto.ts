import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @IsOptional()
  @IsString()
  categoriaId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioCompra?: number;

  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsOptional()
  @IsNumber()
  margenGanancia?: number;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
