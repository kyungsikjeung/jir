import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Controller('spaces/:key/compliance')
export class ComplianceController {
  constructor(private complianceService: ComplianceService) {}

  @Get()
  async getSummary(@Param('key') key: string) {
    return this.complianceService.getSummary(key);
  }

  @Get(':processCode')
  async getProcessDetail(@Param('key') key: string, @Param('processCode') processCode: string) {
    return this.complianceService.getProcessDetail(key, processCode);
  }

  @Put('checklists/:id')
  async updateChecklist(@Param('id') id: string, @Body() body: any) {
    return this.complianceService.updateChecklist(id, body);
  }

  @Post('assessments')
  async createAssessment(@Param('key') key: string, @Body() body: any) {
    return this.complianceService.createAssessment(key, body, body.assessorId || 'system');
  }
}
