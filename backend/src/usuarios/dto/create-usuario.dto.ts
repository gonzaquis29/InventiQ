import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Rol } from '@prisma/client';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Rol)
  rol: Rol;
}
