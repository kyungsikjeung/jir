import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { GitService } from './git.service';

@Controller('git')
export class GitController {
  constructor(private gitService: GitService) {}

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    return this.gitService.handleWebhook(body);
  }

  @Get('connections')
  async getConnections() {
    return this.gitService.getConnections();
  }

  @Post('connections')
  async createConnection(@Body() body: any) {
    return this.gitService.createConnection(body);
  }
}
