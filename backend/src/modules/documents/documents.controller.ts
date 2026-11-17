import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Controller('spaces/:key/docs')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  async getTree(@Param('key') key: string) {
    return this.documentsService.getTree(key);
  }

  @Get(':pageId')
  async getPage(@Param('pageId') pageId: string) {
    return this.documentsService.getPage(pageId);
  }

  @Post()
  async createPage(@Param('key') key: string, @Body() body: any) {
    return this.documentsService.createPage(key, body, body.reporterId || 'system');
  }

  @Put(':pageId')
  async updatePage(@Param('pageId') pageId: string, @Body() body: any) {
    return this.documentsService.updatePage(pageId, body, body.userId || 'system');
  }

  @Delete(':pageId')
  async deletePage(@Param('pageId') pageId: string) {
    await this.documentsService.deletePage(pageId);
    return { success: true };
  }

  @Get(':pageId/versions')
  async getVersions(@Param('pageId') pageId: string) {
    return this.documentsService.getVersions(pageId);
  }
}
