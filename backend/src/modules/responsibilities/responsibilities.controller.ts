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
}
