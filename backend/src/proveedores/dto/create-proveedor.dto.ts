import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsOptional()
  @IsString()
  contacto?: string;

  @IsOptional()
  @IsString()
  ruc?: string;
}
