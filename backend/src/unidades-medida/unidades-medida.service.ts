import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnidadesMedidaService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.unidadMedida.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const unidad = await this.prisma.unidadMedida.findUnique({ where: { id } });
    if (!unidad) throw new NotFoundException('Unidad de medida no encontrada');
    return unidad;
  }

  create(nombre: string, factor?: number) {
    return this.prisma.unidadMedida.create({ data: { nombre, factor: factor ?? null } });
  }

  async update(id: string, nombre: string, factor?: number) {
    await this.findOne(id);
    return this.prisma.unidadMedida.update({ where: { id }, data: { nombre, factor: factor ?? null } });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.unidadMedida.delete({ where: { id } });
  }
}
