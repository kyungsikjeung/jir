import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ResponsibilitiesService } from './responsibilities.service';

@Controller('spaces/:key/rr')
export class ResponsibilitiesController {
  constructor(private service: ResponsibilitiesService) {}

  @Get()
  async getMatrix(@Param('key') key: string) {
    return this.service.getMatrix(key);
  }

  @Post()
  async set(@Param('key') key: string, @Body() body: any) {
    return this.service.setResponsibility(key, body);
  }

  @Put(':id')
  async update(
    @Param('key') key: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.setResponsibility(key, body);
  }

  @Delete(':id')
  async remove(@Param('key') key: string, @Param('id') id: string) {
    return this.service.remove(key, id);
  }

  @Get('assignments')
  async getAssignments(@Param('key') key: string) {
    return this.service.getAssignments(key);
  }

  @Post('assignments')
  async assign(
    @Param('key') key: string,
    @Body() body: { roleId: string; userId: string; isPrimary?: boolean },
  ) {
    return this.service.assign(key, body);
  }

  @Delete('assignments/:id')
  async unassign(@Param('key') key: string, @Param('id') id: string) {
    return this.service.unassign(key, id);
  }
}
