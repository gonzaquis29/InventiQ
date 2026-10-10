import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
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

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
};

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private auditoria: AuditoriaService,
  ) {}

  findAll() {
    return this.prisma.usuario.findMany({
      select: SELECT_SAFE,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: SELECT_SAFE,
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async create(dto: CreateUsuarioDto, actorId: string) {
    const existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existente)
      throw new ConflictException('Ya existe un usuario con ese email');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        rol: dto.rol,
      },
      select: SELECT_SAFE,
    });
    await this.auditoria.registrar({
      usuarioId: actorId,
      accion: 'USUARIO_CREADO',
      entidad: 'usuario',
      entidadId: usuario.id,
      detalle: `Usuario "${usuario.nombre}" (${usuario.email}) creado como ${ETIQUETA_ROL[usuario.rol]}`,
    });
    return usuario;
  }

  // Protege el acceso: nadie puede quitarse a sí mismo el rol de administrador ni desactivarse, y
  // siempre debe quedar al menos un administrador activo (si no, nadie podría administrar el sistema).
  private async validarCambio(
    actual: { id: string; rol: Rol; activo: boolean },
    cambios: { rol?: Rol; activo?: boolean },
    actorId: string,
  ) {
    const pierdeAdmin =
      actual.rol === Rol.ADMIN &&
      actual.activo &&
      (cambios.rol === Rol.VENDEDOR || cambios.activo === false);
    const seDesactiva = cambios.activo === false && actual.activo;
    if (actual.id === actorId && (pierdeAdmin || seDesactiva)) {
      throw new BadRequestException(
        'No puedes quitarte tu propio rol de administrador ni desactivar tu propia cuenta',
      );
    }
    if (pierdeAdmin) {
      const otrosAdmins = await this.prisma.usuario.count({
        where: { rol: Rol.ADMIN, activo: true, id: { not: actual.id } },
      });
      if (otrosAdmins === 0)
        throw new BadRequestException(
          'Debe quedar al menos un administrador activo',
        );
    }
  }

  async update(id: string, dto: UpdateUsuarioDto, actorId: string) {
    const actual = await this.findOne(id);
    await this.validarCambio(actual, dto, actorId);

    if (dto.email && dto.email !== actual.email) {
      const otro = await this.prisma.usuario.findUnique({
        where: { email: dto.email },
      });
      if (otro)
        throw new ConflictException('Ya existe un usuario con ese email');
    }

    const { password, ...resto } = dto;
    const data: Record<string, unknown> = { ...resto };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data,
      select: SELECT_SAFE,
    });

    const cambios: string[] = [];
    if (dto.rol && dto.rol !== actual.rol)
      cambios.push(
        `rol: ${ETIQUETA_ROL[actual.rol]} → ${ETIQUETA_ROL[dto.rol]}`,
      );
    if (dto.activo !== undefined && dto.activo !== actual.activo)
      cambios.push(dto.activo ? 'reactivado' : 'desactivado');
    if (dto.nombre && dto.nombre !== actual.nombre) cambios.push('nombre');
    if (dto.email && dto.email !== actual.email) cambios.push('email');
    if (password) cambios.push('contraseña restablecida');
    if (cambios.length > 0) {
      await this.auditoria.registrar({
        usuarioId: actorId,
        accion: 'USUARIO_EDITADO',
        entidad: 'usuario',
        entidadId: id,
        detalle: `Usuario "${usuario.nombre}": ${cambios.join(', ')}`,
      });
    }
    return usuario;
  }

  async remove(id: string, actorId: string) {
    const actual = await this.findOne(id);
    await this.validarCambio(actual, { activo: false }, actorId);
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: SELECT_SAFE,
    });
    await this.auditoria.registrar({
      usuarioId: actorId,
      accion: 'USUARIO_EDITADO',
      entidad: 'usuario',
      entidadId: id,
      detalle: `Usuario "${usuario.nombre}": desactivado`,
    });
    return usuario;
  }
}
