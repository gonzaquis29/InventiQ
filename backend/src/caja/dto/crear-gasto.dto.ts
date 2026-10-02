import { IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CrearGastoDto {
  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  motivo: string;
}
