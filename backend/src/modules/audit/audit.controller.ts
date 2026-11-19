import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async findAll(@Query() filters: any) {
    return this.auditService.findAll(filters);
  }

  @Post('verify')
  async verifyChain(@Body() body: { entityType?: string; entityId?: string }) {
    const valid = await this.auditService.verifyChain(body.entityType, body.entityId);
    return { valid };
  }
}
