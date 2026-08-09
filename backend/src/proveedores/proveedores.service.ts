import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(private prisma: PrismaService) {}

  findAll(params: { soloActivos?: boolean } = {}) {
    return this.prisma.proveedor.findMany({
      where: params.soloActivos ? { activo: true } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const proveedor = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  create(dto: CreateProveedorDto) {
    return this.prisma.proveedor.create({ data: dto });
  }

  async update(id: string, dto: UpdateProveedorDto) {
    await this.findOne(id);
    return this.prisma.proveedor.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Desactivar en vez de borrar: el proveedor puede tener compras asociadas.
    return this.prisma.proveedor.update({ where: { id }, data: { activo: false } });
  }
}
