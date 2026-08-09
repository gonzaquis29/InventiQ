import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

class ImportarProductoRowDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsOptional()
  @IsString()
  marca?: string;

  // Nombre de categoría (no id) — se crea automáticamente si no existe.
  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioCompra?: number;

  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsOptional()
  @IsString()
  unidadCompra?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  factorCompra?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;
}

export class ImportarProductosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportarProductoRowDto)
  productos: ImportarProductoRowDto[];
}
