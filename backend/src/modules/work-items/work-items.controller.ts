import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';

@Controller('spaces/:key/issues')
export class WorkItemsController {
  constructor(private workItemsService: WorkItemsService) {}

  @Get()
  async findAll(
    @Param('key') key: string,
    @Query() filters: { status?: string; priority?: string; assigneeId?: string; type?: string },
  ) {
    return this.workItemsService.findAll(key, filters);
  }

  // ── 링크 (단일 세그먼트 — :issueKey 보다 먼저 선언) ─────────
  @Post('links')
  async linkItems(
    @Body() body: { from: string; to: string; linkType: string },
    @Req() req: any,
  ) {
    return this.workItemsService.linkItems(
      body.from,
      body.to,
      body.linkType || 'relates',
      req.user?.id || 'system',
    );
  }

  // ── WBS 트리 (:issueKey 보다 먼저 선언) ─────────────────────
  @Get('wbs')
  async getWbs(@Param('key') key: string) {
    return this.workItemsService.getWbs(key);
  }

  @Get(':issueKey')
  async findOne(@Param('issueKey') issueKey: string) {
    return this.workItemsService.findByKey(issueKey);
  }

  @Post()
  async create(@Param('key') key: string, @Body() body: any, @Req() req: any) {
    return this.workItemsService.create(key, body, req.user?.id || body.reporterId || 'system');
  }

  @Put(':issueKey')
  async update(@Param('issueKey') issueKey: string, @Body() body: any, @Req() req: any) {
    return this.workItemsService.update(issueKey, body, req.user?.id);
  }

  @Delete(':issueKey')
  async delete(@Param('issueKey') issueKey: string) {
    await this.workItemsService.delete(issueKey);
    return { success: true };
  }

  @Post(':issueKey/transitions')
  async transition(
    @Param('issueKey') issueKey: string,
    @Body() body: { transition: string; comment?: string },
    @Req() req: any,
  ) {
    return this.workItemsService.transition(
      issueKey,
      body.transition,
      req.user?.id || 'system',
      body.comment,
    );
  }

  @Get(':issueKey/comments')
  async getComments(@Param('issueKey') issueKey: string) {
    return this.workItemsService.getComments(issueKey);
  }

  @Post(':issueKey/comments')
  async addComment(
    @Param('issueKey') issueKey: string,
    @Body() body: { body: string },
    @Req() req: any,
  ) {
    return this.workItemsService.addComment(issueKey, body.body, req.user?.id || 'system');
  }
}
