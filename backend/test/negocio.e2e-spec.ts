import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { TEST_DATABASE_URL } from './setup-db';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'secreto-de-pruebas-e2e';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
describe('Flujos críticos del negocio (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let prisma: any;
  let adminToken: string;
  let vendedorToken: string;
  let productoId: string;
  let ventaId: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const hoy = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);

  async function login(email: string, password: string) {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    const { AppModule } = require('../src/app.module');
    const { PrismaService } = require('../src/prisma/prisma.service');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    // Base limpia en cada corrida.
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE usuarios, productos, categorias, ventas, compras, proveedores, gastos_caja, cuadres_caja, audit_logs RESTART IDENTITY CASCADE',
    ).catch(async () => {
      // Si algún nombre de tabla difiere, limpia por modelos.
      await prisma.detalleVenta.deleteMany();
      await prisma.movimientoStock.deleteMany();
      await prisma.venta.deleteMany();
      await prisma.gastoCaja.deleteMany();
      await prisma.cuadreCaja.deleteMany();
      await prisma.producto.deleteMany();
      await prisma.usuario.deleteMany();
    });

    const passwordHash = await bcrypt.hash('Clave12345', 4);
    await prisma.usuario.create({ data: { nombre: 'Admin', email: 'admin@test.pe', passwordHash, rol: 'ADMIN' } });
    await prisma.usuario.create({ data: { nombre: 'Vendedor', email: 'vend@test.pe', passwordHash, rol: 'VENDEDOR' } });
    const producto = await prisma.producto.create({
      data: { nombre: 'Cuaderno', precioVenta: 10, precioCompra: 4, stock: 5, stockMinimo: 1 },
    });
    productoId = producto.id;
    await prisma.producto.create({ data: { nombre: 'Producto parado', precioVenta: 3, precioCompra: 2, stock: 8 } });

    adminToken = await login('admin@test.pe', 'Clave12345');
    vendedorToken = await login('vend@test.pe', 'Clave12345');
    http = request(app.getHttpServer()) as any;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rechaza credenciales inválidas y rutas sin token', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'admin@test.pe', password: 'mala' }).expect(401);
    await request(app.getHttpServer()).get('/api/ventas').expect(401);
  });

  it('el vendedor vende sin abrir caja y se descuenta el stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ventas')
      .set(auth(vendedorToken))
      .send({ metodoPago: 'EFECTIVO', detalles: [{ productoId, cantidad: 2 }] })
      .expect(201);
    ventaId = res.body.id;
    expect(Number(res.body.total)).toBe(20);
    const p = await prisma.producto.findUnique({ where: { id: productoId } });
    expect(p.stock).toBe(3);
  });

  it('no permite vender más que el stock disponible', async () => {
    await request(app.getHttpServer())
      .post('/api/ventas')
      .set(auth(vendedorToken))
      .send({ metodoPago: 'EFECTIVO', detalles: [{ productoId, cantidad: 99 }] })
      .expect(400);
    const p = await prisma.producto.findUnique({ where: { id: productoId } });
    expect(p.stock).toBe(3);
  });

  it('la ganancia usa el costo guardado en la venta, aunque cambie el costo del producto', async () => {
    await prisma.producto.update({ where: { id: productoId }, data: { precioCompra: 9 } });
    const res = await request(app.getHttpServer()).get('/api/reportes/ganancias').set(auth(adminToken)).expect(200);
    expect(res.body.ingresos).toBe(20);
    expect(res.body.costos).toBe(8); // 2 unidades × costo 4 de ese momento
  });

  it('caja del día: efectivo esperado = efectivo vendido − gastos', async () => {
    await request(app.getHttpServer())
      .post('/api/caja/gastos')
      .set(auth(vendedorToken))
      .send({ monto: 5, motivo: 'Pasajes' })
      .expect(201);
    const res = await request(app.getHttpServer()).get('/api/caja/dia').set(auth(vendedorToken)).expect(200);
    expect(res.body.ventas.efectivo).toBe(20);
    expect(res.body.totalGastos).toBe(5);
    expect(res.body.efectivoEsperado).toBe(15);
  });

  it('cuadre registra la diferencia contra lo esperado', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/caja/cuadres')
      .set(auth(vendedorToken))
      .send({ montoContado: 12 })
      .expect(201);
    expect(res.body.montoEsperado).toBe(15);
    expect(res.body.diferencia).toBe(-3);
  });

  it('el vendedor no puede ver días anteriores; el admin sí; fecha inválida da 400', async () => {
    await request(app.getHttpServer()).get('/api/caja/dia?fecha=2020-01-01').set(auth(vendedorToken)).expect(403);
    await request(app.getHttpServer()).get('/api/caja/dia?fecha=2020-01-01').set(auth(adminToken)).expect(200);
    await request(app.getHttpServer()).get(`/api/caja/dia?fecha=${hoy()}x`).set(auth(adminToken)).expect(400);
  });

  it('solo el admin puede anular, y una venta no se anula dos veces', async () => {
    await request(app.getHttpServer())
      .post(`/api/ventas/${ventaId}/anular`)
      .set(auth(vendedorToken))
      .send({ motivo: 'error de cobro' })
      .expect(403);

    const resultados = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post(`/api/ventas/${ventaId}/anular`)
          .set(auth(adminToken))
          .send({ motivo: 'error de cobro' }),
      ),
    );
    expect(resultados.map((r) => r.status).sort()).toEqual([201, 400]);
    const p = await prisma.producto.findUnique({ where: { id: productoId } });
    expect(p.stock).toBe(5); // devuelto una sola vez
  });

  it('las ventas anuladas no cuentan en la caja', async () => {
    const res = await request(app.getHttpServer()).get('/api/caja/dia').set(auth(adminToken)).expect(200);
    expect(res.body.ventas.efectivo).toBe(0);
    expect(res.body.ventas.anuladas).toBe(1);
  });

  it('el historial de ventas viene paginado', async () => {
    const res = await request(app.getHttpServer()).get('/api/ventas?page=1&pageSize=500').set(auth(adminToken)).expect(200);
    expect(res.body.pageSize).toBe(100);
    expect(res.body.total).toBe(1);
  });

  it('reporte de menor rotación lista lo que tiene stock y no se vendió', async () => {
    const res = await request(app.getHttpServer()).get('/api/reportes/productos-sin-rotacion').set(auth(adminToken)).expect(200);
    const nombres = res.body.map((p: any) => p.nombre);
    expect(nombres).toContain('Producto parado');
    expect(nombres).toContain('Cuaderno'); // su única venta fue anulada
    await request(app.getHttpServer()).get('/api/reportes/productos-sin-rotacion').set(auth(vendedorToken)).expect(403);
  });
});
