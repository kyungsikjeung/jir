import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
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

  @Post('links')
  async createLink(@Body() body: any) {
    return this.traceabilityService.createLink(body, body.userId || 'system');
  }

  @Post('suspect/:id/resolve')
  async resolveSuspect(@Param('id') id: string, @Body() body: { resolution: string }) {
    return this.traceabilityService.resolveSuspect(id, body.resolution, 'system');
  }
}
