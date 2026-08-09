import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateUnidadProductoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  // Cuántas unidades ESTÁNDAR del producto equivalen a 1 de esta unidad (ej. "millar" = 1000).
  @IsNumber()
  @Min(0.001)
  factor: number;
}
