import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoMovimientoStock } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { ImportarProductosDto } from './dto/importar-productos.dto';
import { MarcasService } from '../marcas/marcas.service';

const DIAS_PRODUCTO_NUEVO = 7;

interface FindAllParams {
  q?: string;
  soloActivos?: boolean;
  categoriaId?: string;
  marca?: string;
  stockBajo?: boolean;
  nuevos?: boolean;
  page?: number;
  pageSize?: number;
}

/** Quita tildes/diéresis para que "lapiz" encuentre "Lápiz" (búsqueda insensible a acentos). */
function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

@Injectable()
export class ProductosService {
  constructor(
    private prisma: PrismaService,
    private marcasService: MarcasService,
  ) {}

  private registrarMarca(marca?: string) {
    if (marca?.trim()) this.marcasService.create(marca.trim()).catch(() => undefined);
  }

  /** Ids de productos que matchean TODAS las palabras de `q` en nombre/marca/código, sin importar
   * tildes ni orden (ej. "faber lapiz" encuentra "Lápiz Faber Castell"). */
  private async buscarIdsPorTexto(q: string): Promise<string[]> {
    const terminos = normalizarTexto(q).split(/\s+/).filter(Boolean);
    if (terminos.length === 0) return [];

    const condiciones = terminos.map(
      (t) => Prisma.sql`
        translate(
          lower(coalesce(nombre, '') || ' ' || coalesce(marca, '') || ' ' || coalesce("codigoBarras", '')),
          'áéíóúüñ', 'aeiouun'
        ) LIKE ${'%' + t + '%'}
      `,
    );
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM productos WHERE ${Prisma.join(condiciones, ' AND ')}
    `;
    return rows.map((r) => r.id);
  }

  async findAll(params: FindAllParams) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const idsPorTexto = params.q ? await this.buscarIdsPorTexto(params.q) : null;

    const where: Prisma.ProductoWhereInput = {
      activo: params.soloActivos ? true : undefined,
      categoriaId: params.categoriaId || undefined,
      marca: params.marca ? { equals: params.marca, mode: 'insensitive' } : undefined,
      createdAt: params.nuevos ? { gte: new Date(Date.now() - DIAS_PRODUCTO_NUEVO * 24 * 60 * 60 * 1000) } : undefined,
      id: idsPorTexto ? { in: idsPorTexto } : undefined,
    };

    if (params.stockBajo) {
      const [ids, total] = await Promise.all([
        this.prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM productos
          WHERE activo = true AND stock <= "stockMinimo"
          ${params.categoriaId ? Prisma.sql`AND "categoriaId" = ${params.categoriaId}` : Prisma.empty}
          ${params.marca ? Prisma.sql`AND marca ILIKE ${params.marca}` : Prisma.empty}
          ${idsPorTexto ? Prisma.sql`AND id = ANY(${idsPorTexto})` : Prisma.empty}
          ORDER BY stock ASC
          LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
        `,
        this.prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) as count FROM productos
          WHERE activo = true AND stock <= "stockMinimo"
          ${params.categoriaId ? Prisma.sql`AND "categoriaId" = ${params.categoriaId}` : Prisma.empty}
          ${params.marca ? Prisma.sql`AND marca ILIKE ${params.marca}` : Prisma.empty}
          ${idsPorTexto ? Prisma.sql`AND id = ANY(${idsPorTexto})` : Prisma.empty}
        `,
      ]);
      const data = await this.prisma.producto.findMany({
        where: { id: { in: ids.map((r) => r.id) } },
        include: { categoria: true, unidadesAlternativas: true },
        orderBy: { stock: 'asc' },
      });
      return { data, total: Number(total[0]?.count ?? 0), page, pageSize };
    }

    const [data, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        include: { categoria: true, unidadesAlternativas: true },
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.producto.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  findStockBajo() {
    return this.prisma.$queryRaw`
      SELECT * FROM productos WHERE activo = true AND stock <= "stockMinimo" ORDER BY stock ASC
    `;
  }

  async findOne(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true, unidadesAlternativas: { orderBy: { factor: 'asc' } } },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  findUnidades(productoId: string) {
    return this.prisma.unidadProducto.findMany({ where: { productoId }, orderBy: { factor: 'asc' } });
  }

  async createUnidad(productoId: string, dto: { nombre: string; factor: number }) {
    await this.findOneSimple(productoId);
    return this.prisma.unidadProducto.create({ data: { productoId, nombre: dto.nombre, factor: dto.factor } });
  }

  async removeUnidad(productoId: string, unidadId: string) {
    const unidad = await this.prisma.unidadProducto.findUnique({ where: { id: unidadId } });
    if (!unidad || unidad.productoId !== productoId) throw new NotFoundException('Unidad no encontrada para este producto');
    return this.prisma.unidadProducto.delete({ where: { id: unidadId } });
  }

  private async findOneSimple(id: string) {
    const producto = await this.prisma.producto.findUnique({ where: { id } });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  async findByCodigoBarras(codigo: string) {
    const producto = await this.prisma.producto.findUnique({ where: { codigoBarras: codigo } });
    if (!producto) throw new NotFoundException('Producto no encontrado para ese código');
    return producto;
  }

  create(dto: CreateProductoDto) {
    this.registrarMarca(dto.marca);
    return this.prisma.producto.create({
      data: {
        nombre: dto.nombre,
        marca: dto.marca || null,
        codigoBarras: dto.codigoBarras || null,
        categoriaId: dto.categoriaId || null,
        precioCompra: dto.precioCompra ?? 0,
        precioVenta: dto.precioVenta,
        margenGanancia: dto.margenGanancia ?? null,
        unidad: dto.unidad ?? 'unidad',
        stock: dto.stock ?? 0,
        stockMinimo: dto.stockMinimo ?? 5,
      },
    });
  }

  async update(id: string, dto: UpdateProductoDto) {
    await this.findOne(id);
    this.registrarMarca(dto.marca);
    return this.prisma.producto.update({
      where: { id },
      data: {
        ...dto,
        categoriaId: dto.categoriaId === '' ? null : dto.categoriaId,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.producto.update({ where: { id }, data: { activo: false } });
  }

  async ajustarStock(id: string, dto: AjustarStockDto, usuarioId: string) {
    const producto = await this.findOne(id);
    const nuevoStock = producto.stock + dto.cantidad;
    if (nuevoStock < 0) {
      throw new BadRequestException('El ajuste dejaría el stock en negativo');
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.producto.update({ where: { id }, data: { stock: nuevoStock } });
      await tx.movimientoStock.create({
        data: {
          productoId: id,
          tipo: TipoMovimientoStock.AJUSTE,
          cantidad: dto.cantidad,
          motivo: dto.motivo,
          usuarioId,
        },
      });
      return actualizado;
    });
  }

  async importar(dto: ImportarProductosDto) {
    const creados: string[] = [];
    const omitidos: { fila: number; nombre: string; motivo: string }[] = [];
    const categoriaCache = new Map<string, string>();

    for (const [index, row] of dto.productos.entries()) {
      try {
        if (row.codigoBarras) {
          const existente = await this.prisma.producto.findUnique({ where: { codigoBarras: row.codigoBarras } });
          if (existente) {
            omitidos.push({ fila: index + 1, nombre: row.nombre, motivo: `Ya existe un producto con el código "${row.codigoBarras}"` });
            continue;
          }
        }

        let categoriaId: string | undefined;
        if (row.categoria) {
          const nombreCategoria = row.categoria.trim();
          categoriaId = categoriaCache.get(nombreCategoria);
          if (!categoriaId) {
            const categoria = await this.prisma.categoria.upsert({
              where: { nombre: nombreCategoria },
              update: {},
              create: { nombre: nombreCategoria },
            });
            categoriaId = categoria.id;
            categoriaCache.set(nombreCategoria, categoriaId);
          }
        }

        this.registrarMarca(row.marca);
        const producto = await this.prisma.producto.create({
          data: {
            nombre: row.nombre,
            marca: row.marca || null,
            codigoBarras: row.codigoBarras || null,
            categoriaId: categoriaId ?? null,
            precioCompra: row.precioCompra ?? 0,
            precioVenta: row.precioVenta,
            unidad: row.unidad ?? 'unidad',
            stock: row.stock ?? 0,
            stockMinimo: row.stockMinimo ?? 5,
          },
        });
        if (row.unidadCompra && row.factorCompra) {
          await this.prisma.unidadProducto.create({
            data: { productoId: producto.id, nombre: row.unidadCompra, factor: row.factorCompra },
          });
        }
        creados.push(producto.id);
      } catch (err) {
        omitidos.push({ fila: index + 1, nombre: row.nombre, motivo: err instanceof Error ? err.message : 'Error desconocido' });
      }
    }

    return { totalCreados: creados.length, totalOmitidos: omitidos.length, omitidos };
  }

  historialMovimientos(id: string) {
    return this.prisma.movimientoStock.findMany({
      where: { productoId: id },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
