import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearCuadreDto {
  @IsNumber()
  @Min(0)
  montoContado: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nota?: string;
}
