import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { WorkItemsModule } from './modules/work-items/work-items.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { RequirementsModule } from './modules/requirements/requirements.module';
import { TestsModule } from './modules/tests/tests.module';
import { TraceabilityModule } from './modules/traceability/traceability.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { SearchModule } from './modules/search/search.module';
import { UploadModule } from './modules/upload/upload.module';
import { ExportModule } from './modules/export/export.module';
import { McpModule } from './modules/mcp/mcp.module';
import { StakeholdersModule } from './modules/stakeholders/stakeholders.module';
import { GitModule } from './modules/git/git.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'short', ttl: 1000, limit: 10 }, { name: 'medium', ttl: 10000, limit: 50 }, { name: 'long', ttl: 60000, limit: 200 }]),
    CacheModule.register({ isGlobal: true, ttl: 300, max: 1000 }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SpacesModule,
    WorkItemsModule,
    DocumentsModule,
    RequirementsModule,
    TestsModule,
    TraceabilityModule,
    WorkflowsModule,
    ComplianceModule,
    NotificationModule,
    SearchModule,
    UploadModule,
    ExportModule,
    McpModule,
    StakeholdersModule,
    GitModule,
    AuditModule,
  ],
})
export class AppModule {}
