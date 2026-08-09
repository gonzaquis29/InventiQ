import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.categoria.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    return categoria;
  }

  create(nombre: string) {
    return this.prisma.categoria.create({ data: { nombre } });
  }

  async update(id: string, nombre: string) {
    await this.findOne(id);
    return this.prisma.categoria.update({ where: { id }, data: { nombre } });
  }

  async remove(id: string) {
    await this.findOne(id);
    const enUso = await this.prisma.producto.count({ where: { categoriaId: id } });
    if (enUso > 0) {
      throw new BadRequestException(`No se puede eliminar: hay ${enUso} producto(s) usando esta categoría`);
    }
    return this.prisma.categoria.delete({ where: { id } });
  }
}
