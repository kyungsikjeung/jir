import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';

@Controller('spaces/:key/issues')
export class WorkItemsController {
  constructor(private workItemsService: WorkItemsService) {}

  @Get()
  async findAll(@Param('key') key: string, @Query() filters: { status?: string; priority?: string; assigneeId?: string; type?: string }) {
    return this.workItemsService.findAll(key, filters);
  }

  @Get(':issueKey')
  async findOne(@Param('issueKey') issueKey: string) {
    return this.workItemsService.findByKey(issueKey);
  }

  @Post()
  async create(@Param('key') key: string, @Body() body: any) {
    return this.workItemsService.create(key, body, body.reporterId || 'system');
  }

  @Put(':issueKey')
  async update(@Param('issueKey') issueKey: string, @Body() body: any) {
    return this.workItemsService.update(issueKey, body);
  }

  @Delete(':issueKey')
  async delete(@Param('issueKey') issueKey: string) {
    await this.workItemsService.delete(issueKey);
    return { success: true };
  }

  @Post(':issueKey/transitions')
  async transition(@Param('issueKey') issueKey: string, @Body() body: { transition: string; comment?: string }) {
    return this.workItemsService.transition(issueKey, body.transition, 'system', body.comment);
  }

  @Post(':issueKey/comments')
  async addComment(@Param('issueKey') issueKey: string, @Body() body: { body: string }) {
    return { message: 'Comment added', issueKey, body: body.body };
  }

  @Post('links')
  async linkItems(@Body() body: { from: string; to: string; linkType: string }) {
    return this.workItemsService.linkItems(body.from, body.to, body.linkType, 'system');
  }
}
