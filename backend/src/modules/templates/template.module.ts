import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TemplateService } from './template.service';

@Module({
  imports: [PrismaModule],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
