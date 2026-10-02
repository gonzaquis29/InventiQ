import { ConfigService } from '@nestjs/config';

const PLACEHOLDER =
  'cambia-este-secreto-en-produccion-por-uno-largo-y-aleatorio';

/** Lee JWT_SECRET y aborta el arranque si falta o, en producción, si es débil o el de ejemplo. */
export function jwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) throw new Error('Falta JWT_SECRET en las variables de entorno');
  if (
    config.get<string>('NODE_ENV') === 'production' &&
    (secret === PLACEHOLDER || secret.length < 32)
  ) {
    throw new Error(
      'JWT_SECRET de producción debe ser aleatorio y de al menos 32 caracteres',
    );
  }
  return secret;
}
