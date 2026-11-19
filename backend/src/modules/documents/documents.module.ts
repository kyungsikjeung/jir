import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TraceabilityModule } from '../traceability/traceability.module';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [PrismaModule, TraceabilityModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
