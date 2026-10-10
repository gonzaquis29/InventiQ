import { SetMetadata } from '@nestjs/common';

export const AUDITAR_KEY = 'auditar';

export interface OpcionesAuditar {
  accion: string;
  entidad: string;
  // `res` es lo que devolvió el handler; `req` la petición (body, params, user).
  detalle: (res: any, req: any) => string;
  entidadId?: (res: any, req: any) => string | undefined;
}

/** Registra en la auditoría cuando el handler termina con éxito. */
export const Auditar = (opciones: OpcionesAuditar) =>
  SetMetadata(AUDITAR_KEY, opciones);
