import { IsInt, IsString, MinLength } from 'class-validator';

export class AjustarStockDto {
  @IsInt()
  cantidad: number;

  @IsString()
  @MinLength(3)
  motivo: string;
}
