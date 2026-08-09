import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarcasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.marca.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const marca = await this.prisma.marca.findUnique({ where: { id } });
    if (!marca) throw new NotFoundException('Marca no encontrada');
    return marca;
  }

  create(nombre: string) {
    return this.prisma.marca.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }

  async update(id: string, nombre: string) {
    await this.findOne(id);
    return this.prisma.marca.update({ where: { id }, data: { nombre } });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.marca.delete({ where: { id } });
  }
}
