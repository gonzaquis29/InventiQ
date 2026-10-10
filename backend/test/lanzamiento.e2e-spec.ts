/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import { execFileSync } from 'node:child_process';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TEST_DATABASE_URL } from './setup-db';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'secreto-de-pruebas-e2e';

/**
 * Recorrido completo de un día de negocio, tal como lo vivirían las personas reales:
 * primer admin con el script → equipo → catálogo → compra → ventas → caja → anulación →
 * reportes → roles → auditoría. Todo por HTTP, sin tocar la base salvo para limpiarla.
 */
describe('Lanzamiento: recorrido completo del negocio (e2e)', () => {
  let app: INestApplication;
  let prisma: any;
  const http = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  const CLAVE = 'Clave12345';
  let admin: string;
  let vendedor: string;
  let vendedorId: string;
  let adminId: string;
  let lapizId: string;
  let cuadernoId: string;
  let proveedorId: string;
  let ventaEfectivoId: string;

  async function login(email: string, password = CLAVE) {
    const res = await http().post('/api/auth/login').send({ email, password });
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
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE usuarios, productos, categorias, ventas, compras, proveedores, gastos_caja, cuadres_caja, audit_logs RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('1. Puesta en marcha', () => {
    it('el script crear-admin crea la primera cuenta, y rechaza claves débiles y emails repetidos', () => {
      const entorno = { ...process.env, DATABASE_URL: TEST_DATABASE_URL, ADMIN_NOMBRE: 'Dueña', ADMIN_EMAIL: 'duena@bazar.pe', ADMIN_PASSWORD: CLAVE };
      execFileSync('node', ['scripts/crear-admin.mjs'], { env: entorno, stdio: 'pipe' });
      expect(() => execFileSync('node', ['scripts/crear-admin.mjs'], { env: entorno, stdio: 'pipe' })).toThrow(); // email repetido
      expect(() =>
        execFileSync('node', ['scripts/crear-admin.mjs'], { env: { ...entorno, ADMIN_EMAIL: 'otra@bazar.pe', ADMIN_PASSWORD: '123' }, stdio: 'pipe' }),
      ).toThrow();
    });

    it('el admin entra y la API de salud responde', async () => {
      await http().get('/api/health').expect(200);
      admin = await login('duena@bazar.pe');
      expect(admin).toBeTruthy();
      const me = await http().get('/api/auth/me').set(auth(admin)).expect(200);
      adminId = me.body.userId;
      expect(me.body.rol).toBe('ADMIN');
    });
  });

  describe('2. Equipo y catálogo', () => {
    it('el admin crea al vendedor desde la app y este puede entrar', async () => {
      const res = await http()
        .post('/api/usuarios')
        .set(auth(admin))
        .send({ nombre: 'Luis Vendedor', email: 'luis@bazar.pe', password: CLAVE, rol: 'VENDEDOR' })
        .expect(201);
      vendedorId = res.body.id;
      expect(res.body.passwordHash).toBeUndefined();
      vendedor = await login('luis@bazar.pe');
      expect(vendedor).toBeTruthy();
    });

    it('no se repite un email y el listado nunca expone contraseñas', async () => {
      await http().post('/api/usuarios').set(auth(admin)).send({ nombre: 'Otro', email: 'luis@bazar.pe', password: CLAVE, rol: 'VENDEDOR' }).expect(409);
      const lista = await http().get('/api/usuarios').set(auth(admin)).expect(200);
      expect(lista.body).toHaveLength(2);
      expect(JSON.stringify(lista.body)).not.toContain('passwordHash');
    });

    it('el admin importa el inventario y el vendedor lo consulta (también por código de barras)', async () => {
      const imp = await http()
        .post('/api/productos/importar')
        .set(auth(admin))
        .send({
          productos: [
            { nombre: 'Lápiz HB', categoria: 'Útiles', codigoBarras: '7750001', precioCompra: 0.5, precioVenta: 1, stock: 10, stockMinimo: 3 },
            { nombre: 'Cuaderno A4', categoria: 'Útiles', codigoBarras: '7750002', precioCompra: 3, precioVenta: 5, stock: 4, stockMinimo: 2 },
            { nombre: 'Lápiz HB duplicado', codigoBarras: '7750001', precioVenta: 1 },
          ],
        })
        .expect(201);
      expect(imp.body.totalCreados).toBe(2);
      expect(imp.body.totalOmitidos).toBe(1);

      const porCodigo = await http().get('/api/productos/codigo/7750001').set(auth(vendedor)).expect(200);
      lapizId = porCodigo.body.id;
      expect(porCodigo.body.nombre).toBe('Lápiz HB');
      const lista = await http().get('/api/productos?q=cuaderno').set(auth(vendedor)).expect(200);
      cuadernoId = (lista.body.data ?? lista.body)[0].id;
    });

    it('registrar una compra sube el stock y actualiza el costo', async () => {
      const prov = await http().post('/api/proveedores').set(auth(admin)).send({ nombre: 'Distribuidora Norte' }).expect(201);
      proveedorId = prov.body.id;
      await http()
        .post('/api/compras')
        .set(auth(admin))
        .send({ proveedorId, detalles: [{ productoId: lapizId, cantidadComprada: 20, costoUnitarioCompra: 0.6 }] })
        .expect(201);
      const p = await prisma.producto.findUnique({ where: { id: lapizId } });
      expect(p.stock).toBe(30);
      expect(Number(p.precioCompra)).toBeCloseTo(0.6);
    });
  });

  describe('3. Un día de ventas', () => {
    it('el vendedor cobra en efectivo, con Yape y mixto', async () => {
      const efectivo = await http()
        .post('/api/ventas')
        .set(auth(vendedor))
        .send({ metodoPago: 'EFECTIVO', detalles: [{ productoId: lapizId, cantidad: 10 }, { productoId: cuadernoId, cantidad: 1 }] })
        .expect(201);
      ventaEfectivoId = efectivo.body.id;
      expect(Number(efectivo.body.total)).toBe(15);

      await http().post('/api/ventas').set(auth(vendedor)).send({ metodoPago: 'YAPE_PLIN', detalles: [{ productoId: cuadernoId, cantidad: 1 }] }).expect(201);
      await http()
        .post('/api/ventas')
        .set(auth(vendedor))
        .send({ metodoPago: 'MIXTO', montoEfectivo: 3, montoDigital: 2, detalles: [{ productoId: cuadernoId, cantidad: 1 }] })
        .expect(201);
      await http()
        .post('/api/ventas')
        .set(auth(vendedor))
        .send({ metodoPago: 'MIXTO', montoEfectivo: 1, montoDigital: 1, detalles: [{ productoId: cuadernoId, cantidad: 1 }] })
        .expect(400); // la suma no cuadra con el total
    });

    it('no se vende más de lo que hay', async () => {
      // Quedan 0 cuadernos (4 − 1 − 1 − 1 = 1 en realidad): pedir de más debe fallar sin tocar el stock.
      const antes = await prisma.producto.findUnique({ where: { id: cuadernoId } });
      await http().post('/api/ventas').set(auth(vendedor)).send({ metodoPago: 'EFECTIVO', detalles: [{ productoId: cuadernoId, cantidad: antes.stock + 1 }] }).expect(400);
      const despues = await prisma.producto.findUnique({ where: { id: cuadernoId } });
      expect(despues.stock).toBe(antes.stock);
    });

    it('dos cajeros vendiendo lo último a la vez: solo uno lo logra', async () => {
      const { stock } = await prisma.producto.findUnique({ where: { id: cuadernoId } });
      expect(stock).toBe(1);
      const res = await Promise.all(
        [vendedor, admin].map((t) =>
          http().post('/api/ventas').set(auth(t)).send({ metodoPago: 'EFECTIVO', detalles: [{ productoId: cuadernoId, cantidad: 1 }] }),
        ),
      );
      expect(res.map((r) => r.status).sort()).toEqual([201, 400]);
      expect((await prisma.producto.findUnique({ where: { id: cuadernoId } })).stock).toBe(0);
    });

    it('caja del día: gasto y cuadre', async () => {
      const antes = await http().get('/api/caja/dia').set(auth(vendedor)).expect(200);
      const efectivoVentas = antes.body.ventas.efectivo;
      expect(efectivoVentas).toBeGreaterThan(0);
      await http().post('/api/caja/gastos').set(auth(vendedor)).send({ monto: 4, motivo: 'Pasajes de delivery' }).expect(201);
      const dia = await http().get('/api/caja/dia').set(auth(vendedor)).expect(200);
      expect(dia.body.efectivoEsperado).toBeCloseTo(efectivoVentas - 4);
      const cuadre = await http().post('/api/caja/cuadres').set(auth(vendedor)).send({ montoContado: dia.body.efectivoEsperado }).expect(201);
      expect(cuadre.body.diferencia).toBe(0);
    });
  });

  describe('4. Permisos por rol', () => {
    it('el vendedor NO puede entrar a lo administrativo', async () => {
      const prohibidos: [string, string, object?][] = [
        ['get', '/api/usuarios'],
        ['post', '/api/usuarios', { nombre: 'X', email: 'x@x.pe', password: CLAVE, rol: 'ADMIN' }],
        ['get', '/api/compras'],
        ['get', '/api/proveedores'],
        ['get', '/api/reportes/ventas'],
        ['get', '/api/reportes/productos-sin-rotacion'],
        ['get', '/api/auditoria'],
        ['post', '/api/productos', { nombre: 'Hack', precioVenta: 1 }],
        ['post', `/api/productos/${lapizId}/ajustar-stock`, { cantidad: 5, motivo: 'prueba' }],
        ['post', `/api/ventas/${ventaEfectivoId}/anular`, { motivo: 'prueba' }],
      ];
      for (const [metodo, ruta, cuerpo] of prohibidos) {
        const res = await (http() as any)[metodo](ruta).set(auth(vendedor)).send(cuerpo);
        expect({ ruta, status: res.status }).toEqual({ ruta, status: 403 });
      }
    });

    it('el vendedor SÍ puede vender, ver inventario, ventas y la caja de hoy', async () => {
      for (const ruta of ['/api/productos', '/api/categorias', '/api/ventas', `/api/ventas/${ventaEfectivoId}`, '/api/caja/dia']) {
        await http().get(ruta).set(auth(vendedor)).expect(200);
      }
    });

    it('sin sesión nada es accesible', async () => {
      for (const ruta of ['/api/productos', '/api/ventas', '/api/caja/dia', '/api/auditoria', '/api/usuarios']) {
        await http().get(ruta).expect(401);
      }
      await http().get('/api/ventas').set(auth('token.falso.inventado')).expect(401);
    });
  });

  describe('5. Cierre del día (admin)', () => {
    it('anula una venta: devuelve el stock y deja de contar en caja y reportes', async () => {
      const antes = (await prisma.producto.findUnique({ where: { id: lapizId } })).stock;
      await http().post(`/api/ventas/${ventaEfectivoId}/anular`).set(auth(admin)).send({ motivo: 'Cliente devolvió todo' }).expect(201);
      expect((await prisma.producto.findUnique({ where: { id: lapizId } })).stock).toBe(antes + 10);
      await http().post(`/api/ventas/${ventaEfectivoId}/anular`).set(auth(admin)).send({ motivo: 'otra vez' }).expect(400);
      const dia = await http().get('/api/caja/dia').set(auth(admin)).expect(200);
      expect(dia.body.ventas.anuladas).toBe(1);
    });

    it('los reportes cuadran con lo vendido', async () => {
      const rango = '?desde=2020-01-01T00:00:00Z&hasta=2100-01-01T00:00:00Z';
      const dia = await http().get('/api/caja/dia').set(auth(admin)).expect(200);
      const resumen = await http().get(`/api/reportes/ventas${rango}`).set(auth(admin)).expect(200);
      expect(resumen.body.totalVentas).toBeCloseTo(dia.body.ventas.total);
      const gan = await http().get(`/api/reportes/ganancias${rango}`).set(auth(admin)).expect(200);
      expect(gan.body.ingresos).toBeCloseTo(resumen.body.totalVentas);
      expect(gan.body.ganancia).toBeCloseTo(gan.body.ingresos - gan.body.costos);
      await http().get(`/api/reportes/caja${rango}`).set(auth(admin)).expect(200);
      await http().get('/api/reportes/inventario').set(auth(admin)).expect(200);
    });
  });

  describe('6. Gestión de roles', () => {
    it('un ascenso o descenso de rol rige de inmediato, sin volver a iniciar sesión', async () => {
      await http().get('/api/reportes/inventario').set(auth(vendedor)).expect(403);
      await http().patch(`/api/usuarios/${vendedorId}`).set(auth(admin)).send({ rol: 'ADMIN' }).expect(200);
      await http().get('/api/reportes/inventario').set(auth(vendedor)).expect(200); // mismo token
      await http().patch(`/api/usuarios/${vendedorId}`).set(auth(admin)).send({ rol: 'VENDEDOR' }).expect(200);
      await http().get('/api/reportes/inventario').set(auth(vendedor)).expect(403);
    });

    it('el admin no puede quitarse su rol ni desactivarse (nadie quedaría administrando)', async () => {
      await http().patch(`/api/usuarios/${adminId}`).set(auth(admin)).send({ rol: 'VENDEDOR' }).expect(400);
      await http().patch(`/api/usuarios/${adminId}`).set(auth(admin)).send({ activo: false }).expect(400);
      await http().delete(`/api/usuarios/${adminId}`).set(auth(admin)).expect(400);
      expect((await prisma.usuario.findUnique({ where: { id: adminId } })).rol).toBe('ADMIN');
    });

    it('con dos admins uno puede dejar al otro, pero siempre queda uno activo', async () => {
      await http().patch(`/api/usuarios/${vendedorId}`).set(auth(admin)).send({ rol: 'ADMIN' }).expect(200);
      const segundo = await login('luis@bazar.pe');
      await http().patch(`/api/usuarios/${adminId}`).set(auth(segundo)).send({ rol: 'VENDEDOR' }).expect(200); // el 2.º degrada al 1.º
      await http().patch(`/api/usuarios/${vendedorId}`).set(auth(segundo)).send({ rol: 'VENDEDOR' }).expect(400); // pero no a sí mismo: es el último
      await http().patch(`/api/usuarios/${adminId}`).set(auth(segundo)).send({ rol: 'ADMIN' }).expect(200); // se restaura el 1.º
      await http().patch(`/api/usuarios/${vendedorId}`).set(auth(admin)).send({ rol: 'VENDEDOR' }).expect(200);
    });

    it('desactivar a un usuario cierra su acceso al instante, aunque su token siga vigente', async () => {
      await http().get('/api/ventas').set(auth(vendedor)).expect(200);
      await http().delete(`/api/usuarios/${vendedorId}`).set(auth(admin)).expect(200);
      await http().get('/api/ventas').set(auth(vendedor)).expect(401);
      await http().post('/api/auth/login').send({ email: 'luis@bazar.pe', password: CLAVE }).expect(401);
      await http().patch(`/api/usuarios/${vendedorId}`).set(auth(admin)).send({ activo: true }).expect(200);
      vendedor = await login('luis@bazar.pe');
      await http().get('/api/ventas').set(auth(vendedor)).expect(200);
    });

    it('el admin puede restablecer la contraseña de un vendedor', async () => {
      await http().patch(`/api/usuarios/${vendedorId}`).set(auth(admin)).send({ password: 'NuevaClave99' }).expect(200);
      await http().post('/api/auth/login').send({ email: 'luis@bazar.pe', password: CLAVE }).expect(401);
      await http().post('/api/auth/login').send({ email: 'luis@bazar.pe', password: 'NuevaClave99' }).expect(200);
    });
  });

  describe('7. Auditoría', () => {
    it('registra quién hizo qué, y solo el admin la ve', async () => {
      await http().get('/api/auditoria').set(auth(vendedor)).expect(403);
      const res = await http().get('/api/auditoria?pageSize=100').set(auth(admin)).expect(200);
      const acciones = new Set(res.body.data.map((e: any) => e.accion));
      for (const esperada of [
        'LOGIN',
        'LOGIN_FALLIDO',
        'USUARIO_CREADO',
        'USUARIO_EDITADO',
        'PRODUCTOS_IMPORTADOS',
        'COMPRA_REGISTRADA',
        'VENTA_CREADA',
        'VENTA_ANULADA',
        'GASTO_REGISTRADO',
        'CUADRE_REGISTRADO',
      ]) {
        expect(acciones).toContain(esperada);
      }
    });

    it('cada evento guarda el autor correcto y un detalle legible', async () => {
      const res = await http().get('/api/auditoria?pageSize=100').set(auth(admin)).expect(200);
      const ventas = res.body.data.filter((e: any) => e.accion === 'VENTA_CREADA');
      expect(ventas.length).toBe(4); // 3 del vendedor + 1 del admin en la carrera por el último cuaderno
      expect(ventas.some((e: any) => e.usuarioNombre === 'Luis Vendedor' && e.detalle.includes('S/ 15.00 (EFECTIVO, 2 ítems)'))).toBe(true);
      const anulacion = res.body.data.find((e: any) => e.accion === 'VENTA_ANULADA');
      expect(anulacion.usuarioNombre).toBe('Dueña');
      expect(anulacion.entidadId).toBe(ventaEfectivoId);
      expect(anulacion.detalle).toContain('Cliente devolvió todo');
      const cambioRol = res.body.data.find((e: any) => e.accion === 'USUARIO_EDITADO' && e.detalle.includes('Vendedor → Administrador'));
      expect(cambioRol).toBeTruthy();
    });

    it('no se guardan contraseñas en el registro, y los intentos fallidos quedan anotados', async () => {
      const res = await http().get('/api/auditoria?pageSize=100').set(auth(admin)).expect(200);
      const texto = JSON.stringify(res.body);
      expect(texto).not.toContain(CLAVE);
      expect(texto).not.toContain('NuevaClave99');
      expect(res.body.data.filter((e: any) => e.accion === 'LOGIN_FALLIDO').length).toBeGreaterThan(0);
    });

    it('se puede filtrar por acción y paginar', async () => {
      const f = await http().get('/api/auditoria?accion=VENTA_ANULADA').set(auth(admin)).expect(200);
      expect(f.body.total).toBe(1);
      const p = await http().get('/api/auditoria?pageSize=3&page=2').set(auth(admin)).expect(200);
      expect(p.body.data).toHaveLength(3);
      expect(p.body.page).toBe(2);
    });

    it('un fallo de auditoría no rompe la operación', async () => {
      const original = prisma.auditLog.create;
      prisma.auditLog.create = () => Promise.reject(new Error('base de auditoría caída'));
      try {
        await http().post('/api/caja/gastos').set(auth(vendedor)).send({ monto: 1, motivo: 'Prueba sin auditoría' }).expect(201);
      } finally {
        prisma.auditLog.create = original;
      }
    });
  });
});
