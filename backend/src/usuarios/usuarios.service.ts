import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const SELECT_SAFE = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  createdAt: true,
};

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.usuario.findMany({ select: SELECT_SAFE, orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id }, select: SELECT_SAFE });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async create(dto: CreateUsuarioDto) {
    const existente = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existente) throw new ConflictException('Ya existe un usuario con ese email');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.usuario.create({
      data: { nombre: dto.nombre, email: dto.email, passwordHash, rol: dto.rol },
      select: SELECT_SAFE,
    });
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      delete data.password;
    }
    return this.prisma.usuario.update({ where: { id }, data, select: SELECT_SAFE });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.usuario.update({ where: { id }, data: { activo: false }, select: SELECT_SAFE });
  }
}
