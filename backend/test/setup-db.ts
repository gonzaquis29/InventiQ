import { execSync } from 'node:child_process';

// Las pruebas e2e usan SU PROPIA base (nunca la de desarrollo): se crea/actualiza con las migraciones.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/inventiq_test';

export default function setup() {
  if (!/_test(\?|$)/.test(TEST_DATABASE_URL)) {
    throw new Error('TEST_DATABASE_URL debe apuntar a una base cuyo nombre termine en _test');
  }
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
