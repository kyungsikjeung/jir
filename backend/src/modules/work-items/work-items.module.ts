import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WorkItemsService } from './work-items.service';
import { WorkItemsController } from './work-items.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WorkItemsController],
  providers: [WorkItemsService],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
