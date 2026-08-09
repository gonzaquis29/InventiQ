import { IsIn, IsNumber, IsString, Min, MinLength } from 'class-validator';

export class MovimientoCajaDto {
  @IsIn(['RETIRO', 'INGRESO'])
  tipo: 'RETIRO' | 'INGRESO';

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsString()
  @MinLength(3)
  motivo: string;
}
