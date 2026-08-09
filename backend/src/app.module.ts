import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { MarcasModule } from './marcas/marcas.module';
import { UnidadesMedidaModule } from './unidades-medida/unidades-medida.module';
import { ProductosModule } from './productos/productos.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { ComprasModule } from './compras/compras.module';
import { VentasModule } from './ventas/ventas.module';
import { CajaModule } from './caja/caja.module';
import { ReportesModule } from './reportes/reportes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    CategoriasModule,
    MarcasModule,
    UnidadesMedidaModule,
    ProductosModule,
    ProveedoresModule,
    ComprasModule,
    VentasModule,
    CajaModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
