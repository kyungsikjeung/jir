import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ExportModule } from '../export/export.module';
import {
  EngineRegistry,
  WorkflowEngine,
  AuditEngine,
  NotificationEngine,
  ExportEngine,
} from './engines.service';
import { AuditService } from '../audit/audit.service';
import { ExportService } from '../export/export.service';
import { EnginesController } from './engines.controller';

@Module({
  imports: [PrismaModule, AuditModule, ExportModule],
  controllers: [EnginesController],
  providers: [
    WorkflowEngine,
    AuditEngine,
    NotificationEngine,
    ExportEngine,
    EngineRegistry,
    {
      provide: 'REGISTERED_ENGINES',
      useFactory: (
        registry: EngineRegistry,
        workflow: WorkflowEngine,
        audit: AuditEngine,
        notification: NotificationEngine,
        exporter: ExportEngine,
      ) => {
        registry.register(workflow);
        registry.register(audit);
        registry.register(notification);
        registry.register(exporter);
        return registry.list();
      },
      inject: [EngineRegistry, WorkflowEngine, AuditEngine, NotificationEngine, ExportEngine],
    },
  ],
  exports: [EngineRegistry, WorkflowEngine, AuditEngine, NotificationEngine, ExportEngine],
})
export class EnginesModule {}
