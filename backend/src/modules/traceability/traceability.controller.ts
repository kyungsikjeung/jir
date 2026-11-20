import { Controller, Get, Post, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { TraceabilityService } from './traceability.service';

@Controller('spaces/:key/trace')
export class TraceabilityController {
  constructor(private traceabilityService: TraceabilityService) {}

  @Get()
  async getMatrix(@Param('key') key: string) {
    return this.traceabilityService.getMatrix(key);
  }

  @Get('coverage')
  async getCoverage(@Param('key') key: string) {
    return this.traceabilityService.getCoverage(key);
  }

  @Get('suspect')
  async getSuspectLinks(@Param('key') key: string) {
    return this.traceabilityService.getSuspectLinks(key);
  }

  @Get('links')
  async getLinks(@Param('key') key: string, @Query('itemId') itemId: string) {
    return this.traceabilityService.getLinks(key, itemId);
  }

  /** 링크 생성자·해결자는 인증된 사용자로 강제 (body 위조 방지) */
  @Post('links')
  async createLink(@Body() body: any, @Request() req: any) {
    return this.traceabilityService.createLink(body, req.user?.id);
  }

  @Post('suspect/:id/resolve')
  async resolveSuspect(
    @Param('id') id: string,
    @Body() body: { resolution: string },
    @Request() req: any,
  ) {
    return this.traceabilityService.resolveSuspect(id, body.resolution, req.user?.id);
  }
}
