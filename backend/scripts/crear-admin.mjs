// Crea un usuario Administrador. Pensado para el primer arranque (no hay registro público).
//
//   npm run crear-admin                    → pregunta nombre, email y contraseña
//   ADMIN_NOMBRE=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run crear-admin   → sin preguntas
//
// Usa DATABASE_URL del entorno (o de backend/.env).
import readline from 'node:readline';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

function preguntar(texto, { oculto = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (oculto) {
    rl._writeToOutput = (s) => rl.output.write(s.startsWith(texto) ? s : '*'.repeat(s.length ? 1 : 0));
  }
  return new Promise((resolve) =>
    rl.question(texto, (respuesta) => {
      rl.close();
      if (oculto) process.stdout.write('\n');
      resolve(respuesta.trim());
    }),
  );
}

// En local carga backend/.env; en producción las variables ya vienen del hosting (dotenv no se instala).
await import('dotenv/config').catch(() => {});

const prisma = new PrismaClient();

try {
  const nombre = process.env.ADMIN_NOMBRE || (await preguntar('Nombre: '));
  const email = (process.env.ADMIN_EMAIL || (await preguntar('Email: '))).toLowerCase();
  const password = process.env.ADMIN_PASSWORD || (await preguntar('Contraseña (mín. 8 caracteres): ', { oculto: true }));

  if (!nombre) throw new Error('El nombre es obligatorio');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Email inválido');
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');

  if (await prisma.usuario.findUnique({ where: { email } })) {
    throw new Error(`Ya existe un usuario con el email ${email}`);
  }

  const usuario = await prisma.usuario.create({
    data: { nombre, email, rol: 'ADMIN', passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`✔ Administrador creado: ${usuario.nombre} <${usuario.email}>`);
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
