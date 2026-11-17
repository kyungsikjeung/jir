import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async findAll(@Query() filters: any) {
    return this.auditService.findAll(filters);
  }
}
