import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TemplateModule } from '../templates/template.module';
import { AuditModule } from '../audit/audit.module';
import { SpacesService } from './spaces.service';
import { SpacesController } from './spaces.controller';

@Module({
  imports: [PrismaModule, TemplateModule, AuditModule],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}
