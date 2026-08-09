import { Module } from '@nestjs/common';
import { MarcasService } from './marcas.service';
import { MarcasController } from './marcas.controller';

@Module({
  controllers: [MarcasController],
  providers: [MarcasService],
  exports: [MarcasService],
})
export class MarcasModule {}
