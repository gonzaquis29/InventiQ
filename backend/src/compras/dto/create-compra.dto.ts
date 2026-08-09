import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class DetalleCompraDto {
  @IsString()
  productoId: string;

  // Cómo lo compró el negocio, ej: 5 docenas a S/30 la docena
  @IsOptional()
  @IsString()
  unidadCompra?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  factorUnidad?: number;

  @IsInt()
  @Min(1)
  cantidadComprada: number;

  @IsNumber()
  @Min(0)
  costoUnitarioCompra: number;
}

export class CreateCompraDto {
  @IsString()
  proveedorId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleCompraDto)
  detalles: DetalleCompraDto[];
}
