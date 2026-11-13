import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { SpacesService } from './spaces.service';

@Controller('spaces')
export class SpacesController {
  constructor(private spacesService: SpacesService) {}

  @Get()
  async findAll(@Query('orgId') orgId?: string) {
    return this.spacesService.findAll(orgId);
  }

  @Get(':key')
  async findOne(@Param('key') key: string) {
    return this.spacesService.findByKey(key);
  }

  @Post()
  async create(@Body() body: { name: string; key: string; orgId: string; createdById?: string }) {
    return this.spacesService.create(body);
  }

  @Put(':key')
  async update(@Param('key') key: string, @Body() body: { name?: string; description?: string; isArchived?: boolean }) {
    return this.spacesService.update(key, body);
  }

  @Delete(':key')
  async delete(@Param('key') key: string) {
    await this.spacesService.delete(key);
    return { success: true };
  }

  @Get(':key/members')
  async getMembers(@Param('key') key: string) {
    return this.spacesService.getMembers(key);
  }

  @Post(':key/members')
  async addMember(@Param('key') key: string, @Body() body: { userId: string; roleId: string; addedById: string }) {
    return this.spacesService.addMember(key, body.userId, body.roleId, body.addedById);
  }

  @Delete(':key/members/:userId')
  async removeMember(@Param('key') key: string, @Param('userId') userId: string) {
    await this.spacesService.removeMember(key, userId);
    return { success: true };
  }
}
