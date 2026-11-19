import { Controller, Get, Put, Post, Param, Body, Req } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Controller('spaces/:key/compliance')
export class ComplianceController {
  constructor(private complianceService: ComplianceService) {}

  @Get()
  async getSummary(@Param('key') key: string) {
    return this.complianceService.getSummary(key);
  }

  // ── 베이스라인 (형상관리) ──────────────────────────────────
  @Get('baselines')
  async getBaselines(@Param('key') key: string) {
    return this.complianceService.getBaselines(key);
  }

  @Post('baselines')
  async createBaseline(@Param('key') key: string, @Body() body: any, @Req() req: any) {
    return this.complianceService.createBaseline(key, body, req.user?.id || body.createdById || 'system');
  }

  @Post('baselines/:id/release')
  async releaseBaseline(@Param('id') id: string, @Req() req: any) {
    return this.complianceService.releaseBaseline(id, req.user?.id || 'system');
  }

  @Get(':processCode')
  async getProcessDetail(@Param('key') key: string, @Param('processCode') processCode: string) {
    return this.complianceService.getProcessDetail(key, processCode);
  }

  @Put('checklists/:id')
  async updateChecklist(@Param('id') id: string, @Body() body: any) {
    return this.complianceService.updateChecklist(id, body);
  }

  @Post('baselines/:id/lock')
  async lockBaseline(
    @Param('key') key: string,
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.complianceService.lockBaseline(key, id, {
      reason: body.reason,
      userId: req.user?.id || body.userId || 'system',
    });
  }

  @Get('baselines/:id/diff')
  async getBaselineDiff(@Param('key') key: string, @Param('id') id: string) {
    return this.complianceService.getBaselineDiff(key, id);
  }

  @Post('assessments')
  async createAssessment(@Param('key') key: string, @Body() body: any, @Req() req: any) {
    return this.complianceService.createAssessment(key, body, req.user?.id || body.assessorId || 'system');
  }
}
