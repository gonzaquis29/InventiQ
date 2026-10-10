import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { jwtSecret } from './jwt-secret';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(config),
    });
  }

  // Se consulta la base en cada petición: así desactivar a un usuario o cambiarle el rol surte efecto
  // al instante, sin esperar a que venza su token. El rol que vale es el de la base, no el del token.
  async validate(payload: JwtPayload) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, rol: true, activo: true },
    });
    if (!usuario || !usuario.activo)
      throw new UnauthorizedException('Sesión no válida');
    return { userId: usuario.id, email: usuario.email, rol: usuario.rol };
  }
}
