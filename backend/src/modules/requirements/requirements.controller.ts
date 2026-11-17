import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { RequirementsService } from './requirements.service';

@Controller('spaces/:key/requirements')
export class RequirementsController {
  constructor(private requirementsService: RequirementsService) {}

  @Get()
  async findAll(@Param('key') key: string, @Query() filters: any) {
    return this.requirementsService.findAll(key, filters);
  }

  @Post()
  async create(@Param('key') key: string, @Body() body: any) {
    return this.requirementsService.create(key, body, body.reporterId || 'system');
  }
}
