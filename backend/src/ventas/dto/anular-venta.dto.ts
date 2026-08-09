import { IsString, MinLength } from 'class-validator';

export class AnularVentaDto {
  @IsString()
  @MinLength(3)
  motivo: string;
}
