import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TraceabilityModule } from '../traceability/traceability.module';
import { FieldDefinitionModule } from '../field-definitions/field-definition.module';
import { EnginesModule } from '../engines/engines.module';
import { WorkItemsService } from './work-items.service';
import { WorkItemsController } from './work-items.controller';

@Module({
  imports: [PrismaModule, TraceabilityModule, FieldDefinitionModule, EnginesModule],
  controllers: [WorkItemsController],
  providers: [WorkItemsService],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
