import { Global, Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditoriaInterceptor } from './auditoria.interceptor';

@Global()
@Module({
  providers: [
    AuditoriaService,
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
  ],
  controllers: [AuditoriaController],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
