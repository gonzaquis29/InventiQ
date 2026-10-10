import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditoriaService } from './auditoria.service';
import { AUDITAR_KEY, type OpcionesAuditar } from './auditar.decorator';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditoria: AuditoriaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const opciones = this.reflector.get<OpcionesAuditar | undefined>(
      AUDITAR_KEY,
      context.getHandler(),
    );
    if (!opciones) return next.handle();

    const req = context
      .switchToHttp()
      .getRequest<{ user?: { userId: string } }>();
    return next.handle().pipe(
      tap((res: unknown) => {
        void this.auditoria.registrar({
          usuarioId: req.user?.userId,
          accion: opciones.accion,
          entidad: opciones.entidad,
          entidadId: opciones.entidadId?.(res, req),
          detalle: opciones.detalle(res, req),
        });
      }),
    );
  }
}
