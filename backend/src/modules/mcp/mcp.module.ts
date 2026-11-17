import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';

@Module({
  imports: [PrismaModule],
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
