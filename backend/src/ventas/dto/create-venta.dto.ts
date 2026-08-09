import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { MetodoPago } from '@prisma/client';

class DetalleVentaDto {
  @IsString()
  productoId: string;

  // Siempre en la unidad ESTÁNDAR del producto (ya convertida desde la unidad elegida en el POS).
  @IsInt()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  // Precio realmente cobrado por unidad estándar. Si se omite, se usa el precio de catálogo.
  // Permite que el cajero registre lo que efectivamente cobró (no siempre el precio de lista).
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;

  // Metadata descriptiva de cómo se vendió en realidad (ej. "paquete" con factor 10), para el
  // historial/ticket. No afecta el cálculo de stock ni de dinero — eso ya viene normalizado arriba.
  @IsOptional()
  @IsString()
  unidadVendida?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  factorUnidad?: number;
}

export class CreateVentaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  detalles: DetalleVentaDto[];

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoEfectivo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoDigital?: number;
}
