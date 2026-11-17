import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { TestsService } from './tests.service';

@Controller('spaces/:key/tests')
export class TestsController {
  constructor(private testsService: TestsService) {}

  @Get('cases')
  async findTestCases(@Param('key') key: string, @Query() filters: any) {
    return this.testsService.findTestCases(key, filters);
  }

  @Post('cases')
  async createTestCase(@Param('key') key: string, @Body() body: any) {
    return this.testsService.createTestCase(key, body, body.reporterId || 'system');
  }

  @Post('runs')
  async createTestRun(@Param('key') key: string, @Body() body: any) {
    return this.testsService.createTestRun(key, body, body.createdById || 'system');
  }

  @Post('runs/:runId/results')
  async recordResult(@Param('runId') runId: string, @Body() body: any) {
    return this.testsService.recordTestResult(runId, body, body.executedById || 'system');
  }
}
