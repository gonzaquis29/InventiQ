import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditoria: AuditoriaService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (!usuario || !usuario.activo) {
      await this.auditoria.registrar({
        usuarioNombre: dto.email,
        accion: 'LOGIN_FALLIDO',
        entidad: 'usuario',
        detalle: usuario ? 'Intento de ingreso con cuenta desactivada' : 'Intento de ingreso con un email que no existe',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!passwordValida) {
      await this.auditoria.registrar({
        usuarioId: usuario.id,
        accion: 'LOGIN_FALLIDO',
        entidad: 'usuario',
        entidadId: usuario.id,
        detalle: 'Contraseña incorrecta',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.auditoria.registrar({ usuarioId: usuario.id, accion: 'LOGIN', entidad: 'usuario', entidadId: usuario.id, detalle: 'Inicio de sesión' });

    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }
}
