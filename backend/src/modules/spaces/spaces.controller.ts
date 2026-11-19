import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

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
  @RequirePermission('space:create')
  async create(@Body() dto: CreateSpaceDto, @Request() req: any) {
    return this.spacesService.create({
      key: dto.key,
      name: dto.name,
      orgId: dto.orgId,
      description: dto.description,
      templateVersionId: dto.templateVersionId,
      memberEmails: dto.memberEmails,
      createdById: req.user?.id,
    });
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
