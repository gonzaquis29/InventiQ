import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProveedorDto } from './create-proveedor.dto';

export class UpdateProveedorDto extends PartialType(CreateProveedorDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
