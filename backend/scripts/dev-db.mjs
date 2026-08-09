import EmbeddedPostgres from 'embedded-postgres';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pg = new EmbeddedPostgres({
  databaseDir: path.join(__dirname, '..', '.devdb'),
  user: 'postgres',
  password: 'postgres',
  port: 5433,
  persistent: true,
});

async function main() {
  try {
    await pg.initialise();
  } catch {
    // ya inicializado en una corrida anterior
  }
  await pg.start();
  try {
    await pg.createDatabase('inventiq');
  } catch {
    // ya existe
  }
  console.log('Postgres local de desarrollo listo en postgresql://postgres:postgres@localhost:5433/inventiq');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await pg.stop();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await pg.stop();
  process.exit(0);
});
